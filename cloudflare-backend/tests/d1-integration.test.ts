import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/index';
import { createLead } from '../src/db/repositories/leads.repository';
import { listActivePrices } from '../src/db/repositories/public.repository';
import { leadSchema } from '../src/validation';
import type { Env } from '../src/types/env';
import { testDatabase } from './helpers/d1';

const open: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(open.splice(0).map((close) => close())); });

async function environment() {
  const database = await testDatabase();
  open.push(database.close);
  const sent: unknown[] = [];
  const env = {
    DB: database.db,
    EVENT_QUEUE: { send: async (message: unknown) => { sent.push(message); } },
    PUBLIC_RATE_LIMITER: { limit: async () => ({ success: true }) },
    LEAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
    APP_ENV: 'test',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    TURNSTILE_BYPASS: 'true',
  } as unknown as Env;
  return { ...database, env, sent };
}

function lead(turnstileToken = 'local-bypass') {
  return {
    name: 'Тестова заявка', phone: '+380671234567', email: null, city: 'Вінниця',
    preferred_contact: 'phone', contact_handle: '', comment: "O'Brien; DROP TABLE prices;--",
    configuration: {
      product_type: 'window', profile: 'grand-pro', dimensions: { width_mm: 1400, height_mm: 1200 },
      construction: 'double', sections: 2, opening: ['fixed', 'tilt_turn'],
      glass_unit: 'energy_saving', color: 'white', extras: ['warm_edge'],
      services_requested: { delivery: false, installation: false },
    },
    pricing_version: null, needs_delivery: true, needs_installation: false,
    consent: true, website: '', turnstile_token: turnstileToken,
  };
}

async function request(env: Env, body: unknown, key = 'lead-test-0001') {
  const secure = env.APP_ENV === 'production';
  return app.request(secure ? 'https://api.example/api/leads' : '/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, Origin: secure ? 'https://localhost' : 'http://localhost:3000' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }, env);
}

describe('D1 public API', () => {
  it('stores a lead and two outbox events atomically, then replays with a fresh Turnstile token', async () => {
    const { db, env } = await environment();
    const pricesResponse = await app.request('/api/prices', undefined, env);
    const prices = await pricesResponse.json<{ pricing_version: string }>();
    const firstInput = { ...lead('token-one'), pricing_version: prices.pricing_version };
    const first = await request(env, firstInput);
    expect(first.status).toBe(201);
    const replay = await request(env, { ...firstInput, turnstile_token: 'token-two' });
    expect(replay.status).toBe(200);
    expect(await db.prepare('SELECT COUNT(*) AS count FROM leads').first<{ count: number }>()).toEqual({ count: 1 });
    expect(await db.prepare('SELECT COUNT(*) AS count FROM outbox_events').first<{ count: number }>()).toEqual({ count: 2 });
    expect(await db.prepare('SELECT comment FROM leads').first<{ comment: string }>()).toEqual({ comment: "O'Brien; DROP TABLE prices;--" });
    expect((await db.prepare('SELECT COUNT(*) AS count FROM prices').first<{ count: number }>())?.count).toBeGreaterThan(0);

    const conflict = await request(env, { ...firstInput, city: 'Львів', turnstile_token: 'token-three' });
    expect(conflict.status).toBe(409);
  });

  it('rolls back the lead when an outbox insert fails', async () => {
    const { db } = await environment();
    await db.prepare("CREATE TRIGGER reject_outbox BEFORE INSERT ON outbox_events BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
    const input = leadSchema.parse(lead());
    const priceRows = await listActivePrices(db);
    await expect(createLead(db, input, 'rollback-test-001', priceRows)).rejects.toThrow();
    expect(await db.prepare('SELECT COUNT(*) AS count FROM leads').first<{ count: number }>()).toEqual({ count: 0 });
  });

  it('rejects invalid bodies, disallowed origins and private API guesses', async () => {
    const { env } = await environment();
    expect((await request(env, '{bad json')).status).toBe(422);
    const file = await app.request('/api/leads', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': 'file-test-0001', Origin: 'http://localhost:3000' }, body: 'file' }, env);
    expect(file.status).toBe(415);
    const oversized = await request(env, { payload: 'x'.repeat(33 * 1024) });
    expect(oversized.status).toBe(413);
    const forbidden = await app.request('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'origin-test-001', Origin: 'https://evil.example' }, body: JSON.stringify(lead()),
    }, env);
    expect(forbidden.status).toBe(403);
    expect((await app.request('/api/leads', undefined, env)).status).toBe(404);
    expect((await app.request('/api/prices/1', { method: 'PATCH' }, env)).status).toBe(404);
    expect((await app.request('/internal/telegram/webhook', { method: 'POST', headers: { Origin: 'http://localhost:3000' } }, env)).status).toBe(403);
  });

  it('requires a valid Turnstile action and allowed hostname outside local mode', async () => {
    const { env } = await environment();
    env.APP_ENV = 'production';
    env.ALLOWED_ORIGINS = 'https://localhost';
    env.TURNSTILE_BYPASS = 'false';
    env.TURNSTILE_SECRET = 'test-secret';
    const prices = await (await app.request('/api/prices', undefined, env)).json<{ pricing_version: string }>();
    const input = { ...lead('verified-token'), pricing_version: prices.pricing_version };
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: 'other', hostname: 'localhost' }), { status: 200 }));
    expect((await request(env, input, 'turnstile-test-1')).status).toBe(403);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: 'lead', hostname: 'localhost' }), { status: 200 }));
    expect((await request(env, input, 'turnstile-test-2')).status).toBe(201);
    fetchMock.mockRestore();
  });

  it('accepts only authorized Telegram webhook updates and deduplicates processed updates', async () => {
    const { db, env } = await environment();
    const adminId = 123456789;
    env.TELEGRAM_BOT_TOKEN = '987654321:test-token';
    env.TELEGRAM_BOT_USERNAME = 'vikora_admin_bot';
    env.TELEGRAM_WEBHOOK_SECRET = 'webhook-secret';
    await db.prepare('INSERT INTO bot_admins(telegram_user_id,display_name) VALUES (?,?)').bind(adminId, 'test admin').run();
    const update = {
      update_id: 991,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: adminId, type: 'private' },
        from: { id: adminId, is_bot: false, first_name: 'Admin' },
        text: '/start',
        entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      result: { message_id: 42, date: 1, chat: { id: adminId, type: 'private' }, text: 'VIKORA admin dashboard' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const call = (body: unknown, secret = 'webhook-secret', headers: Record<string, string> = {}) => app.request('/internal/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': secret, ...headers },
      body: JSON.stringify(body),
    }, env);
    expect((await call(update, 'wrong-secret')).status).toBe(403);
    expect((await call(update, 'webhook-secret', { Origin: 'https://vikora.example' })).status).toBe(403);
    const first = await call(update);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true });
    const replay = await call(update);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ duplicate: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await db.prepare('SELECT status,attempts FROM telegram_updates WHERE update_id=?').bind(update.update_id).first()).toMatchObject({ status: 'processed' });

    const unauthorized = { ...update, update_id: 992, message: { ...update.message, from: { ...update.message.from, id: 987654321 } } };
    expect((await call(unauthorized)).status).toBe(403);
    fetchMock.mockRestore();
  });
});
