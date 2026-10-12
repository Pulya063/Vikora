import { describe, expect, it } from 'vitest';
import { changePrice, claimTelegramUpdate, finishTelegramUpdate, resetLeadDeliveries, saveSession } from '../src/db/repositories/admin.repository';
import { createLead } from '../src/db/repositories/leads.repository';
import { dispatchPendingOutbox } from '../src/jobs/outbox';
import { leadSchema } from '../src/validation';
import type { Env } from '../src/types/env';
import { testDatabase } from './helpers/d1';

describe('Telegram administration and outbox', () => {
  it('fences duplicate Telegram updates with a lease token', async () => {
    const { db, close } = await testDatabase();
    try {
      const first = await claimTelegramUpdate(db, 42);
      expect(first.status).toBe('claimed');
      expect((await claimTelegramUpdate(db, 42)).status).toBe('busy');
      if (first.status !== 'claimed') throw new Error('claim failed');
      await finishTelegramUpdate(db, 42, 'wrong-token', true);
      expect((await claimTelegramUpdate(db, 42)).status).toBe('busy');
      await finishTelegramUpdate(db, 42, first.token, true);
      expect((await claimTelegramUpdate(db, 42)).status).toBe('processed');
    } finally { await close(); }
  });

  it('applies an authorized price confirmation once and audits it', async () => {
    const { db, close } = await testDatabase();
    try {
      const actor = 123456;
      await db.prepare('INSERT INTO bot_admins(telegram_user_id,display_name) VALUES (?,?)').bind(actor, 'Test admin').run();
      const price = await db.prepare("SELECT id,value_micros,version FROM prices WHERE category='base' AND key='area'").first<{ id: number; value_micros: number; version: number }>();
      if (!price) throw new Error('seed price missing');
      await saveSession(db, actor, 'price_confirm', { id: price.id }, 'nonce-1');
      expect(await changePrice(db, price.id, price.value_micros + 1_000_000, price.version, actor, 'nonce-1')).toBe(true);
      expect(await changePrice(db, price.id, price.value_micros + 2_000_000, price.version, actor, 'nonce-1')).toBe(false);
      const updated = await db.prepare('SELECT value_micros,version FROM prices WHERE id=?').bind(price.id).first<{ value_micros: number; version: number }>();
      expect(updated).toEqual({ value_micros: price.value_micros + 1_000_000, version: price.version + 1 });
      expect(await db.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action='price.changed'").first<{ count: number }>()).toEqual({ count: 1 });
    } finally { await close(); }
  });

  it('queues each persistent outbox event once until recovery is due', async () => {
    const { db, close } = await testDatabase();
    try {
      const input = leadSchema.parse({
        name: 'Черга тест', phone: '+380671234567', email: null, city: '', preferred_contact: 'phone',
        contact_handle: '', comment: '', configuration: null, pricing_version: null,
        needs_delivery: false, needs_installation: false, consent: true, website: '', turnstile_token: 'local-bypass',
      });
      await createLead(db, input, 'outbox-test-0001', []);
      const sent: unknown[] = [];
      const env = {
        DB: db,
        EVENT_QUEUE: { send: async (message: unknown) => { sent.push(message); } },
      } as unknown as Env;
      expect(await dispatchPendingOutbox(env)).toBe(2);
      expect(sent).toHaveLength(2);
      expect(await dispatchPendingOutbox(env)).toBe(0);
      expect(sent).toHaveLength(2);
      expect(await db.prepare("SELECT COUNT(*) AS count FROM outbox_events WHERE status='queued'").first<{ count: number }>()).toEqual({ count: 2 });
    } finally { await close(); }
  });

  it('allows safe Notion ambiguity reconciliation while quarantining uncertain Telegram sends', async () => {
    const { db, close } = await testDatabase();
    try {
      const actor = 7654321;
      await db.prepare('INSERT INTO bot_admins(telegram_user_id,display_name) VALUES (?,?)').bind(actor, 'Test admin').run();
      const input = leadSchema.parse({
        name: 'Повтор CRM', phone: '+380671234567', email: null, city: '', preferred_contact: 'phone',
        contact_handle: '', comment: '', configuration: null, pricing_version: null,
        needs_delivery: false, needs_installation: false, consent: true, website: '', turnstile_token: 'local-bypass',
      });
      const { lead } = await createLead(db, input, 'notion-ambiguous-001', []);
      await db.prepare(`UPDATE outbox_events SET status='dead',attempts=5,ambiguous_since='2026-10-12T00:00:00.000Z',last_error_code=destination || '_ambiguous_delivery'
        WHERE aggregate_id=?`).bind(lead.id).run();
      await db.prepare("UPDATE integration_delivery_status SET status='dead',attempts=5 WHERE event_id IN (SELECT id FROM outbox_events WHERE aggregate_id=?)").bind(lead.id).run();

      expect(await resetLeadDeliveries(db, lead.id, actor)).toBe(1);
      const notion = await db.prepare("SELECT status,attempts,ambiguous_since,last_error_code FROM outbox_events WHERE aggregate_id=? AND destination='notion'").bind(lead.id).first();
      const telegram = await db.prepare("SELECT status,last_error_code FROM outbox_events WHERE aggregate_id=? AND destination='telegram'").bind(lead.id).first();
      expect(notion).toMatchObject({ status: 'pending', attempts: 0, last_error_code: null });
      expect((notion as { ambiguous_since: string }).ambiguous_since).toBeTruthy();
      expect(telegram).toEqual({ status: 'dead', last_error_code: 'telegram_ambiguous_delivery' });
      expect(await db.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action='lead.delivery_retry'").first()).toEqual({ count: 1 });
    } finally { await close(); }
  });
});
