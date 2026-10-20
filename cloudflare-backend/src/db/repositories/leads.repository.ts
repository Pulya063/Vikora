import type { LeadRow, PriceRow } from '../schema';
import { calculateEstimate, publicPrices } from '../../services/prices.service';
import type { LeadInput } from '../../validation';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export async function leadRequestHash(input: LeadInput): Promise<string> {
  const semanticInput = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'turnstile_token'));
  return sha256(stable(semanticInput));
}

export class IdempotencyConflictError extends Error {
  constructor() { super('Ключ повторного запиту вже використано для іншої заявки'); }
}

export async function findIdempotentLead(db: D1Database, idempotencyKey: string, requestHash: string): Promise<LeadRow | null> {
  const existing = await db.prepare('SELECT * FROM leads WHERE idempotency_key = ?').bind(idempotencyKey).first<LeadRow>();
  if (existing && existing.request_hash !== requestHash) throw new IdempotencyConflictError();
  return existing;
}

function publicId(): string {
  return `VKR-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

export class PriceChangedError extends Error {
  constructor(readonly estimate: ReturnType<typeof calculateEstimate>) {
    super('Ціни оновлено. Підтвердьте новий розрахунок.');
  }
}

export async function createLead(db: D1Database, input: LeadInput, idempotencyKey: string, priceRows: PriceRow[]): Promise<{ lead: LeadRow; created: boolean }> {
  const requestHash = await leadRequestHash(input);
  const existing = await findIdempotentLead(db, idempotencyKey, requestHash);
  if (existing) return { lead: existing, created: false };

  let estimate: ReturnType<typeof calculateEstimate> | null = null;
  if (input.configuration) {
    estimate = calculateEstimate({ ...input.configuration,
      services_requested: { delivery: input.needs_delivery, installation: input.needs_installation },
    }, await publicPrices(priceRows));
    if (input.pricing_version !== estimate.pricing_version) throw new PriceChangedError(estimate);
  }

  const id = crypto.randomUUID();
  const leadPublicId = publicId();
  const configurationJson = estimate ? JSON.stringify({
    ...estimate.configuration,
    supplier: estimate.supplier,
    estimated_product_price_uah: estimate.estimated_product_price_uah,
    pricing_version: estimate.pricing_version,
    is_mock: estimate.is_mock,
  }) : null;
  const eventRows = (['telegram', 'notion'] as const).map((destination) => ({ id: crypto.randomUUID(), destination }));
  const insertLead = db.prepare(
    `INSERT INTO leads (
      id, public_id, idempotency_key, request_hash, name, phone, email, city,
      preferred_contact, contact_handle, comment, configuration_json,
      estimated_product_price_uah, needs_delivery, needs_installation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, leadPublicId, idempotencyKey, requestHash, input.name, input.phone, input.email,
    input.city, input.preferred_contact, input.contact_handle, input.comment,
    configurationJson, estimate?.estimated_product_price_uah ?? null,
    Number(input.needs_delivery), Number(input.needs_installation),
  );
  const statements: D1PreparedStatement[] = [insertLead];
  for (const event of eventRows) {
    statements.push(db.prepare(
      `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, destination, payload_json)
       VALUES (?, 'lead', ?, 'lead.created', ?, ?)`,
    ).bind(event.id, id, event.destination, JSON.stringify({ leadId: id })));
    statements.push(db.prepare(
      'INSERT INTO integration_delivery_status (event_id, destination) VALUES (?, ?)',
    ).bind(event.id, event.destination));
  }

  try {
    await db.batch(statements);
  } catch (error) {
    const raced = await db.prepare('SELECT * FROM leads WHERE idempotency_key = ?').bind(idempotencyKey).first<LeadRow>();
    if (raced?.request_hash === requestHash) return { lead: raced, created: false };
    if (raced) throw new IdempotencyConflictError();
    throw error;
  }
  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<LeadRow>();
  if (!lead) throw new Error('Lead insert was not visible after transaction');
  return { lead, created: true };
}

export async function recentLeads(db: D1Database, limit = 10): Promise<LeadRow[]> {
  const result = await db.prepare(
    `SELECT * FROM leads ORDER BY created_at DESC LIMIT ?`,
  ).bind(Math.min(20, Math.max(1, limit))).all<LeadRow>();
  return result.results;
}

export async function updateLeadStatus(db: D1Database, leadId: string, status: string, actorId: string): Promise<boolean> {
  if (!['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'].includes(status) || !/^[1-9]\d*$/.test(actorId) || !Number.isSafeInteger(Number(actorId))) return false;
  const auditId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, old_value_json, new_value_json)
      SELECT ?, 'telegram_admin', ?, 'lead.status_changed', 'lead', id, json_object('status',status), json_object('status',?) FROM leads
      WHERE id=? AND status<>? AND EXISTS(SELECT 1 FROM bot_admins WHERE telegram_user_id=? AND active=1)`)
      .bind(auditId, actorId, status, leadId, status, Number(actorId)),
    db.prepare(`UPDATE leads SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(status, leadId, auditId),
    // Reuse the same Notion event: its revision fences a consumer that already read an older status.
    // Ambiguous creates stay in manual review; changing a lead status must not cause a duplicate page.
    db.prepare(`UPDATE outbox_events SET revision=revision+1,
      status=CASE WHEN status='processing' THEN status ELSE 'pending' END,
      attempts=CASE WHEN status='processing' THEN attempts ELSE 0 END,
      available_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_error_code=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE aggregate_type='lead' AND aggregate_id=? AND destination='notion'
      AND COALESCE(last_error_code,'')<>'notion_ambiguous_delivery' AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(leadId, auditId),
    db.prepare(`UPDATE integration_delivery_status SET status=CASE WHEN status='processing' THEN status ELSE 'pending' END,last_error_code=NULL
      WHERE destination='notion' AND event_id IN(SELECT id FROM outbox_events WHERE aggregate_type='lead' AND aggregate_id=? AND COALESCE(last_error_code,'')<>'notion_ambiguous_delivery')
      AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`).bind(leadId, auditId),
  ]);
  return results[1]?.meta.changes === 1;
}
