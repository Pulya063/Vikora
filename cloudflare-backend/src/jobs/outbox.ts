import type { LeadRow } from '../db/schema';
import { syncLeadToNotion } from '../services/notion.service';
import { notifyManager } from '../services/telegram.service';
import type { Env, QueueEventMessage } from '../types/env';
import { classifyTelegramError, DeliveryError, retryDelay } from './delivery-error';

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const LEASE_END = "strftime('%Y-%m-%dT%H:%M:%fZ','now','+2 minutes')";
const ACTIVE = `id=? AND lease_token=? AND status='processing' AND locked_until>${NOW}`;
const MAX_ATTEMPTS = 5;

interface OutboxRow {
  id: string;
  aggregate_id: string;
  destination: 'telegram' | 'notion';
  attempts: number;
  revision: number;
  lease_token: string;
  ambiguous_since: string | null;
}

/** Mark queued before publishing. A crash at either side is recovered by Cron. */
export async function dispatchPendingOutbox(env: Env, limit = 50): Promise<number> {
  const eligibility = `(status IN ('pending','failed') OR (status='queued' AND updated_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes')))
    AND available_at<=${NOW} AND (dispatch_locked_until IS NULL OR dispatch_locked_until<${NOW})`;
  const rows = await env.DB.prepare(`SELECT id,destination FROM outbox_events WHERE ${eligibility} ORDER BY available_at LIMIT ?`)
    .bind(Math.min(100, Math.max(1, limit))).all<QueueEventMessage & { id: string }>();
  let dispatched = 0;
  for (const row of rows.results) {
    const token = crypto.randomUUID();
    const claimed = await env.DB.prepare(`UPDATE outbox_events SET status='queued',dispatch_token=?,dispatch_locked_until=${LEASE_END},updated_at=${NOW}
      WHERE id=? AND ${eligibility}`).bind(token, row.id).run();
    if (claimed.meta.changes !== 1) continue;
    try {
      await env.EVENT_QUEUE.send({ eventId: row.id, destination: row.destination });
      // Never overwrite a consumer that already claimed or completed the event.
      await env.DB.prepare(`UPDATE outbox_events SET dispatch_token=NULL,dispatch_locked_until=NULL WHERE id=? AND dispatch_token=? AND status='queued'`)
        .bind(row.id, token).run();
      dispatched++;
    } catch {
      await env.DB.prepare(`UPDATE outbox_events SET status='failed',dispatch_token=NULL,dispatch_locked_until=NULL,last_error_code='queue_unavailable',
        available_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 seconds'),updated_at=${NOW} WHERE id=? AND dispatch_token=? AND status='queued'`)
        .bind(row.id, token).run();
    }
  }
  return dispatched;
}

async function claim(env: Env, body: QueueEventMessage): Promise<OutboxRow | null> {
  const token = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO integration_locks (aggregate_id,destination,lease_token,locked_until)
      SELECT aggregate_id,destination,?,${LEASE_END} FROM outbox_events
      WHERE id=? AND destination=? AND status IN ('pending','queued','failed') AND available_at<=${NOW}
      ON CONFLICT(aggregate_id,destination) DO UPDATE SET lease_token=excluded.lease_token,locked_until=excluded.locked_until
      WHERE integration_locks.locked_until<=${NOW}`).bind(token, body.eventId, body.destination),
    env.DB.prepare(`UPDATE outbox_events SET status='processing',lease_token=?,locked_until=${LEASE_END},dispatch_token=NULL,dispatch_locked_until=NULL,
      attempts=attempts+1,updated_at=${NOW} WHERE id=? AND destination=? AND status IN ('pending','queued','failed') AND available_at<=${NOW}
      AND EXISTS (SELECT 1 FROM integration_locks l WHERE l.aggregate_id=outbox_events.aggregate_id AND l.destination=outbox_events.destination AND l.lease_token=?)`)
      .bind(token, body.eventId, body.destination, token),
    env.DB.prepare(`UPDATE integration_delivery_status SET status='processing',attempts=attempts+1,last_attempt_at=${NOW}
      WHERE event_id=? AND destination=? AND EXISTS(SELECT 1 FROM outbox_events WHERE ${ACTIVE})`)
      .bind(body.eventId, body.destination, body.eventId, token),
  ]);
  const event = await env.DB.prepare(`SELECT id,aggregate_id,destination,attempts,revision,lease_token,ambiguous_since FROM outbox_events WHERE ${ACTIVE}`)
    .bind(body.eventId, token).first<OutboxRow>();
  if (!event) await env.DB.prepare('DELETE FROM integration_locks WHERE lease_token=?').bind(token).run();
  return event;
}

async function recordWriteIntent(env: Env, event: OutboxRow): Promise<void> {
  const changed = await env.DB.prepare(`UPDATE outbox_events SET ambiguous_since=COALESCE(ambiguous_since,${NOW}) WHERE ${ACTIVE}`)
    .bind(event.id, event.lease_token).run();
  if (changed.meta.changes !== 1) throw new DeliveryError('lease_lost', true);
}

async function complete(env: Env, event: OutboxRow, externalId: string): Promise<void> {
  const statements = [
    env.DB.prepare(`UPDATE integration_delivery_status SET status=CASE WHEN (SELECT revision FROM outbox_events WHERE id=?)=? THEN 'completed' ELSE 'pending' END,
      external_id=?,last_error_code=NULL,delivered_at=${NOW} WHERE event_id=? AND destination=?
      AND EXISTS(SELECT 1 FROM outbox_events WHERE ${ACTIVE})`)
      .bind(event.id, event.revision, externalId, event.id, event.destination, event.id, event.lease_token),
  ];
  if (event.destination === 'notion') statements.push(env.DB.prepare(`UPDATE leads SET notion_page_id=?,updated_at=${NOW} WHERE id=?
    AND EXISTS(SELECT 1 FROM outbox_events WHERE ${ACTIVE})`).bind(externalId, event.aggregate_id, event.id, event.lease_token));
  statements.push(
    env.DB.prepare(`UPDATE outbox_events SET status=CASE WHEN revision=? THEN 'completed' ELSE 'pending' END,
      attempts=CASE WHEN revision=? THEN attempts ELSE 0 END, completed_at=CASE WHEN revision=? THEN ${NOW} ELSE NULL END,
      ambiguous_since=NULL,locked_until=NULL,lease_token=NULL,last_error_code=NULL,available_at=${NOW},updated_at=${NOW} WHERE ${ACTIVE}`)
      .bind(event.revision, event.revision, event.revision, event.id, event.lease_token),
    env.DB.prepare('DELETE FROM integration_locks WHERE lease_token=?').bind(event.lease_token),
  );
  await env.DB.batch(statements);
}

async function fail(env: Env, event: OutboxRow, error: DeliveryError): Promise<{ dead: boolean; delay: number }> {
  const dead = !error.retryable || event.attempts >= MAX_ATTEMPTS;
  const delay = retryDelay(event.attempts, error.retryAfterSeconds);
  const ambiguous = error.ambiguous || Boolean(event.ambiguous_since);
  // An ambiguous Notion create is reconciled by queries only, even after a later
  // read failure. It must never become an ordinary retriable create again.
  const code = dead && ambiguous ? `${event.destination}_ambiguous_delivery` : error.code;
  await env.DB.batch([
    env.DB.prepare(`UPDATE integration_delivery_status SET status=?,last_error_code=?,last_attempt_at=${NOW} WHERE event_id=? AND destination=?
      AND EXISTS(SELECT 1 FROM outbox_events WHERE ${ACTIVE})`)
      .bind(dead ? 'dead' : 'failed', code, event.id, event.destination, event.id, event.lease_token),
    env.DB.prepare(`UPDATE outbox_events SET status=?,locked_until=NULL,lease_token=NULL,last_error_code=?,
      ambiguous_since=CASE WHEN ? THEN COALESCE(ambiguous_since,${NOW}) ELSE NULL END,
      available_at=strftime('%Y-%m-%dT%H:%M:%fZ','now',?),updated_at=${NOW} WHERE ${ACTIVE}`)
      .bind(dead ? 'dead' : 'failed', code, Number(ambiguous), `+${delay} seconds`, event.id, event.lease_token),
    env.DB.prepare('DELETE FROM integration_locks WHERE lease_token=?').bind(event.lease_token),
  ]);
  return { dead, delay };
}

/** D1 remains the durable retry/dead-letter ledger if Queue messages expire. */
export async function recoverOutbox(env: Env): Promise<void> {
  const rows = await env.DB.prepare(`SELECT id,aggregate_id,destination,attempts,revision,lease_token,ambiguous_since FROM outbox_events
    WHERE status='processing' AND locked_until<=${NOW} LIMIT 100`).all<OutboxRow>();
  for (const event of rows.results) {
    const dead = event.attempts >= MAX_ATTEMPTS || (event.destination === 'telegram' && Boolean(event.ambiguous_since));
    const code = event.ambiguous_since ? `${event.destination}_ambiguous_delivery` : 'stale_lease';
    const expired = `id=? AND lease_token IS ? AND status='processing' AND locked_until<=${NOW}`;
    await env.DB.batch([
      env.DB.prepare(`UPDATE integration_delivery_status SET status=?,last_error_code=? WHERE event_id=? AND destination=?
        AND EXISTS(SELECT 1 FROM outbox_events WHERE ${expired})`).bind(dead ? 'dead' : 'failed', code, event.id, event.destination, event.id, event.lease_token),
      env.DB.prepare(`UPDATE outbox_events SET status=?,lease_token=NULL,locked_until=NULL,last_error_code=?,available_at=${NOW},updated_at=${NOW}
        WHERE ${expired}`).bind(dead ? 'dead' : 'failed', code, event.id, event.lease_token),
      env.DB.prepare('DELETE FROM integration_locks WHERE lease_token=?').bind(event.lease_token),
    ]);
  }
  await env.DB.prepare(`DELETE FROM integration_locks WHERE locked_until<=${NOW}`).run();
  await dispatchPendingOutbox(env);
}

export async function consumeOutboxMessage(env: Env, message: Message<QueueEventMessage>): Promise<void> {
  if (!message.body || typeof message.body.eventId !== 'string' || !['telegram','notion'].includes(message.body.destination)) { message.ack(); return; }
  const event = await claim(env, message.body);
  // Duplicates, messages arriving before available_at, and competing leases are
  // safely acknowledged: the persistent ledger and scheduled recovery own retry.
  if (!event) { message.ack(); return; }
  let writeStarted = false;
  try {
    const lead = await env.DB.prepare('SELECT * FROM leads WHERE id=?').bind(event.aggregate_id).first<LeadRow>();
    if (!lead) throw new DeliveryError('lead_not_found', false);
    const beforeWrite = async () => { await recordWriteIntent(env, event); writeStarted = true; };
    let externalId: string;
    if (event.destination === 'notion') externalId = await syncLeadToNotion(env, lead, {
      reconcileOnly: Boolean(event.ambiguous_since), beforeCreate: beforeWrite,
      beforeUpdate: async () => {
        if (!await env.DB.prepare(`SELECT id FROM outbox_events WHERE ${ACTIVE}`).bind(event.id, event.lease_token).first()) throw new DeliveryError('lease_lost', true);
      },
    });
    else {
      await beforeWrite();
      externalId = await notifyManager(env, lead);
    }
    await complete(env, event, externalId);
    message.ack();
  } catch (error) {
    const problem = error instanceof DeliveryError ? error : !writeStarted
      ? new DeliveryError('delivery_storage_unavailable', true)
      : event.destination === 'telegram'
      ? classifyTelegramError(error)
      : new DeliveryError(writeStarted ? 'notion_ambiguous_delivery' : 'delivery_storage_unavailable', true, writeStarted);
    const result = await fail(env, event, problem);
    if (result.dead) message.ack(); else message.retry({ delaySeconds: result.delay });
  }
}
