import type { PriceRow } from '../schema';
import { listActivePrices } from './public.repository';
import { contactKeySchema, contactValueSchemas } from '../../bot/validation';

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export async function isAdmin(db: D1Database, telegramUserId: number): Promise<boolean> {
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId < 1) return false;
  const row = await db.prepare('SELECT 1 AS allowed FROM bot_admins WHERE telegram_user_id = ? AND active = 1')
    .bind(telegramUserId).first<{ allowed: number }>();
  return row?.allowed === 1;
}

export type UpdateClaim = { status: 'claimed'; token: string } | { status: 'processed' } | { status: 'busy' };

export async function claimTelegramUpdate(db: D1Database, updateId: number): Promise<UpdateClaim> {
  const token = crypto.randomUUID();
  await db.prepare('INSERT OR IGNORE INTO telegram_updates(update_id) VALUES (?)').bind(updateId).run();
  const result = await db.prepare(
    `UPDATE telegram_updates SET status='processing',attempts=attempts+1,lease_token=?,locked_until=strftime('%Y-%m-%dT%H:%M:%fZ','now','+120 seconds')
     WHERE update_id=? AND (status IN ('pending','failed') OR (status='processing' AND locked_until < ${NOW}))`,
  ).bind(token, updateId).run();
  if (result.meta.changes === 1) return { status: 'claimed', token };
  const row = await db.prepare('SELECT status FROM telegram_updates WHERE update_id=?').bind(updateId).first<{ status: string }>();
  return { status: row?.status === 'processed' ? 'processed' : 'busy' };
}

export async function finishTelegramUpdate(db: D1Database, updateId: number, token: string, successful: boolean): Promise<void> {
  await db.prepare(
    `UPDATE telegram_updates SET status=?,locked_until=NULL,lease_token=NULL,last_error_code=? WHERE update_id=? AND lease_token=? AND status='processing'`,
  ).bind(successful ? 'processed' : 'failed', successful ? null : 'telegram_handler_failed', updateId, token).run();
}

export interface BotSessionRow { state: string; data_json: string; nonce: string }

export async function getSession(db: D1Database, userId: number): Promise<BotSessionRow> {
  return await db.prepare(`SELECT state,data_json,nonce FROM bot_sessions WHERE telegram_user_id=? AND expires_at > ${NOW}`).bind(userId).first<BotSessionRow>()
    ?? { state: 'menu', data_json: '{}', nonce: '' };
}

export async function saveSession(db: D1Database, userId: number, state: string, data: unknown, nonce = ''): Promise<void> {
  await db.prepare(
    `INSERT INTO bot_sessions(telegram_user_id,state,data_json,nonce,expires_at) VALUES (?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now','+15 minutes'))
     ON CONFLICT(telegram_user_id) DO UPDATE SET state=excluded.state,data_json=excluded.data_json,nonce=excluded.nonce,expires_at=excluded.expires_at,updated_at=${NOW}`,
  ).bind(userId, state, JSON.stringify(data), nonce).run();
}

export async function advanceSession(db: D1Database, userId: number, from: string, state: string, data: unknown, nonce: string): Promise<boolean> {
  const result = await db.prepare(`UPDATE bot_sessions SET state=?,data_json=?,updated_at=${NOW} WHERE telegram_user_id=? AND state=? AND nonce=? AND expires_at > ${NOW}`)
    .bind(state, JSON.stringify(data), userId, from, nonce).run();
  return result.meta.changes === 1;
}

function claimConfirmation(db: D1Database, actorId: number, kind: 'price' | 'contact', nonce: string, operationId: string): D1PreparedStatement {
  return db.prepare(`UPDATE bot_sessions SET state='applying',nonce=? WHERE telegram_user_id=? AND state=? AND nonce=? AND expires_at > ${NOW}
    AND EXISTS (SELECT 1 FROM bot_admins WHERE telegram_user_id=? AND active=1)`)
    .bind(operationId, actorId, `${kind}_confirm`, nonce, actorId);
}

function finishConfirmation(db: D1Database, actorId: number, operationId: string): D1PreparedStatement {
  return db.prepare(`UPDATE bot_sessions SET state='menu',data_json='{}',nonce='',updated_at=${NOW} WHERE telegram_user_id=? AND state='applying' AND nonce=?`)
    .bind(actorId, operationId);
}

export async function changePrice(db: D1Database, id: number, valueMicros: number, expectedVersion: number, actorId: number, nonce: string): Promise<boolean> {
  if (!Number.isSafeInteger(valueMicros) || valueMicros < 0 || valueMicros > 100_000_000_000) return false;
  const operationId = crypto.randomUUID();
  const results = await db.batch([
    claimConfirmation(db, actorId, 'price', nonce, operationId),
    db.prepare(`INSERT INTO audit_logs(id,actor_type,actor_id,action,entity_type,entity_id,old_value_json,new_value_json)
      SELECT ?,'telegram_admin',?,'price.changed','price',id,json_object('value_micros',value_micros,'version',version),json_object('value_micros',?,'version',version+1)
      FROM prices WHERE id=? AND version=? AND active=1
      AND (category NOT IN ('construction','profile','glass') OR ? BETWEEN 100000 AND 10000000)
      AND EXISTS (SELECT 1 FROM bot_sessions WHERE telegram_user_id=? AND state='applying' AND nonce=?)`)
      .bind(operationId, String(actorId), valueMicros, id, expectedVersion, valueMicros, actorId, operationId),
    db.prepare(`UPDATE prices SET value_micros=?,version=version+1,last_operation_id=?,updated_at=${NOW} WHERE id=? AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(valueMicros, operationId, id, operationId),
    finishConfirmation(db, actorId, operationId),
  ]);
  return results[2]?.meta.changes === 1;
}

export async function changeContact(db: D1Database, key: string, value: string | null, expectedVersion: number, actorId: number, nonce: string): Promise<boolean> {
  const parsedKey = contactKeySchema.safeParse(key);
  if (!parsedKey.success || !contactValueSchemas[parsedKey.data].safeParse(value).success) return false;
  const operationId = crypto.randomUUID();
  const statements = [
    claimConfirmation(db, actorId, 'contact', nonce, operationId),
    db.prepare(`INSERT INTO audit_logs(id,actor_type,actor_id,action,entity_type,entity_id,old_value_json,new_value_json)
      SELECT ?,'telegram_admin',?,'contact.changed','contact',key,json_object('value',value,'version',version),json_object('value',?,'version',version+1)
      FROM contacts WHERE key=? AND version=? AND active=1
      AND EXISTS (SELECT 1 FROM bot_sessions WHERE telegram_user_id=? AND state='applying' AND nonce=?)`)
      .bind(operationId, String(actorId), value, key, expectedVersion, actorId, operationId),
    db.prepare(`UPDATE contacts SET value=?,version=version+1,last_operation_id=?,updated_at=${NOW} WHERE key=? AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(value, operationId, key, operationId),
  ];
  if (key === 'phone' && value) {
    const phone = encodeURIComponent(value.replace(/[^+0-9]/g, ''));
    // Only phone-derived deep links follow a changed number; custom HTTPS links remain intact.
    for (const [linkKey, prefix, link] of [
      ['telegram', 'tg://resolve?phone=', `tg://resolve?phone=${phone}`],
      ['viber', 'viber://chat?number=', `viber://chat?number=${phone}`],
    ] as const) {
      const auditId = crypto.randomUUID();
      statements.push(db.prepare(`INSERT INTO audit_logs(id,actor_type,actor_id,action,entity_type,entity_id,old_value_json,new_value_json)
        SELECT ?,'telegram_admin',?,'contact.changed','contact',key,json_object('value',value,'version',version),json_object('value',?,'version',version+1)
        FROM contacts WHERE key=? AND active=1 AND substr(value,1,?)=? AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
        .bind(auditId, String(actorId), link, linkKey, prefix.length, prefix, operationId));
      statements.push(db.prepare(`UPDATE contacts SET value=?,version=version+1,last_operation_id=?,updated_at=${NOW} WHERE key=? AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
        .bind(link, operationId, linkKey, auditId));
    }
  }
  statements.push(finishConfirmation(db, actorId, operationId));
  const results = await db.batch(statements);
  return results[2]?.meta.changes === 1;
}

export async function priceById(db: D1Database, id: number): Promise<PriceRow | null> {
  return db.prepare('SELECT * FROM prices WHERE id = ? AND active = 1').bind(id).first<PriceRow>();
}

export async function allPrices(db: D1Database): Promise<PriceRow[]> { return listActivePrices(db); }

export async function contactRows(db: D1Database) {
  return (await db.prepare('SELECT key,value,kind,version FROM contacts WHERE active=1 ORDER BY key').all<{ key: string; value: string | null; kind: string; version: number }>()).results;
}

export async function resetLeadDeliveries(db: D1Database, leadId: string, actorId: number): Promise<number> {
  const operationId = crypto.randomUUID();
  // A Notion create with unknown outcome can be safely retried in query-only
  // reconciliation mode. Telegram sendMessage has no idempotency lookup, so it
  // stays quarantined for manual review and is never automatically repeated.
  const eligible = `aggregate_type='lead' AND aggregate_id=? AND status IN ('failed','dead') AND COALESCE(last_error_code,'')<>'telegram_ambiguous_delivery'`;
  const results = await db.batch([
    db.prepare(`INSERT INTO audit_logs(id,actor_type,actor_id,action,entity_type,entity_id,old_value_json,new_value_json)
      SELECT ?,'telegram_admin',?,'lead.delivery_retry','lead',?,json_object('events',COUNT(*)),json_object('status','pending') FROM outbox_events
      WHERE ${eligible} AND EXISTS(SELECT 1 FROM bot_admins WHERE telegram_user_id=? AND active=1) HAVING COUNT(*)>0`)
      .bind(operationId, String(actorId), leadId, leadId, actorId),
    db.prepare(`UPDATE integration_delivery_status SET status='pending',attempts=0,last_error_code=NULL
      WHERE event_id IN (SELECT id FROM outbox_events WHERE ${eligible}) AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(leadId, operationId),
    db.prepare(`UPDATE outbox_events SET status='pending',attempts=0,available_at=${NOW},locked_until=NULL,lease_token=NULL,dispatch_token=NULL,dispatch_locked_until=NULL,revision=revision+1,last_error_code=NULL,updated_at=${NOW}
      WHERE ${eligible} AND EXISTS(SELECT 1 FROM audit_logs WHERE id=?)`)
      .bind(leadId, operationId),
  ]);
  return results[2]?.meta.changes ?? 0;
}

export async function systemStatus(db: D1Database) {
  const result = await db.prepare(`SELECT status,COUNT(*) AS count FROM outbox_events GROUP BY status`).all<{ status: string; count: number }>();
  return Object.fromEntries(result.results.map((row) => [row.status, row.count]));
}
