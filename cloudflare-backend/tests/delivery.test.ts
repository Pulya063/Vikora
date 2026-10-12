import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLead } from '../src/db/repositories/leads.repository';
import { consumeOutboxMessage, dispatchPendingOutbox, recoverOutbox } from '../src/jobs/outbox';
import { notifyManager } from '../src/services/telegram.service';
import type { Env, QueueEventMessage } from '../src/types/env';
import { leadSchema } from '../src/validation';
import { testDatabase } from './helpers/d1';

vi.mock('../src/services/telegram.service', () => ({ notifyManager: vi.fn() }));

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { vi.restoreAllMocks(); vi.clearAllMocks(); await Promise.all(closers.splice(0).map((close) => close())); });

async function fixture() {
  const database = await testDatabase();
  closers.push(database.close);
  const send = vi.fn<(body: QueueEventMessage) => Promise<void>>(async () => undefined);
  const env = {
    DB: database.db, EVENT_QUEUE: { send }, APP_ENV: 'test', ALLOWED_ORIGINS: '', TURNSTILE_BYPASS: 'true',
    NOTION_TOKEN: 'test-token', NOTION_DATA_SOURCE_ID: 'test-data-source', TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_MANAGER_CHAT_ID: '1',
  } as unknown as Env;
  const input = leadSchema.parse({
    name: 'Delivery Test', phone: '+380671234567', email: null, city: 'Вінниця', preferred_contact: 'phone',
    contact_handle: '', comment: '', configuration: null, pricing_version: null,
    needs_delivery: true, needs_installation: false, consent: true, website: '', turnstile_token: 'local-bypass',
  });
  const { lead } = await createLead(env.DB, input, 'delivery-test-0001', []);
  const rows = await env.DB.prepare('SELECT id,destination FROM outbox_events').all<{ id: string; destination: 'notion' | 'telegram' }>();
  const event = (destination: 'notion' | 'telegram') => {
    const row = rows.results.find((item) => item.destination === destination)!;
    return { eventId: row.id, destination };
  };
  const state = (destination = 'notion') => env.DB.prepare('SELECT * FROM outbox_events WHERE aggregate_id=? AND destination=?')
    .bind(lead.id, destination).first<{ status: string; attempts: number; ambiguous_since: string | null; last_error_code: string | null; lease_token: string | null }>();
  const due = () => env.DB.prepare("UPDATE outbox_events SET available_at='2000-01-01T00:00:00.000Z'").run();
  return { env, lead, send, event, state, due };
}

function message(body: QueueEventMessage) {
  return { body, id: crypto.randomUUID(), timestamp: new Date(), attempts: 1, ack: vi.fn(), retry: vi.fn() } satisfies Message<QueueEventMessage>;
}

function notionMock(handler: (path: string, init?: RequestInit) => Promise<Response> | Response) {
  const original = globalThis.fetch;
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    return url.startsWith('https://api.notion.com/') ? Promise.resolve(handler(new URL(url).pathname, init)) : original(input, init);
  });
}

const success = (body: unknown) => Response.json(body);
const failure = (status: number, code: string, extra: Record<string, unknown> = {}, headers: HeadersInit = {}) =>
  Response.json({ object: 'error', status, code, message: 'redacted test error', ...extra }, { status, headers });
const pageId = '11111111-1111-1111-1111-111111111111';

describe('persistent delivery and external failure handling', () => {
  it('claims concurrent duplicate queue messages once and acknowledges later duplicates', async () => {
    const { env, event, state } = await fixture();
    vi.mocked(notifyManager).mockResolvedValue('42');
    await Promise.all([consumeOutboxMessage(env, message(event('telegram'))), consumeOutboxMessage(env, message(event('telegram')))]);
    await consumeOutboxMessage(env, message(event('telegram')));
    expect(notifyManager).toHaveBeenCalledTimes(1);
    expect(await state('telegram')).toMatchObject({ status: 'completed', attempts: 1, ambiguous_since: null });
  });

  it('does not regress a consumer completion when queue delivery races the producer response', async () => {
    const { env, send, state } = await fixture();
    vi.mocked(notifyManager).mockResolvedValue('42');
    send.mockImplementation(async (body: QueueEventMessage) => { if (body.destination === 'telegram') await consumeOutboxMessage(env, message(body)); });
    await dispatchPendingOutbox(env);
    expect(await state('telegram')).toMatchObject({ status: 'completed' });
    expect(await state()).toMatchObject({ status: 'queued' });
  });

  it('recovers a stranded queued record and retains records when queue publication fails', async () => {
    const { env, send, state } = await fixture();
    await dispatchPendingOutbox(env);
    expect(send).toHaveBeenCalledTimes(2);
    await env.DB.prepare("UPDATE outbox_events SET updated_at='2000-01-01T00:00:00.000Z' WHERE destination='notion'").run();
    await recoverOutbox(env);
    expect(send).toHaveBeenCalledTimes(3);
    await env.DB.prepare("UPDATE outbox_events SET status='pending' WHERE destination='notion'").run();
    send.mockRejectedValue(new Error('queue unavailable'));
    await dispatchPendingOutbox(env);
    expect(await state()).toMatchObject({ status: 'failed', last_error_code: 'queue_unavailable' });
  });

  it('honors Notion Retry-After and safely retries an explicit rate-limit rejection', async () => {
    const { env, event, state, due } = await fixture();
    let limited = true;
    let creates = 0;
    notionMock((path) => {
      if (path.endsWith('/query')) return success({ results: [] });
      creates++;
      return limited ? failure(429, 'rate_limited', {}, { 'Retry-After': '600' }) : success({ id: pageId });
    });
    const first = message(event('notion'));
    await consumeOutboxMessage(env, first);
    expect(first.retry).toHaveBeenCalledWith({ delaySeconds: expect.any(Number) });
    expect(first.retry.mock.calls[0]![0]!.delaySeconds).toBeGreaterThanOrEqual(600);
    expect(await state()).toMatchObject({ status: 'failed', ambiguous_since: null });
    limited = false;
    await due();
    await consumeOutboxMessage(env, message(event('notion')));
    expect(creates).toBe(2);
    expect(await state()).toMatchObject({ status: 'completed' });
  });

  it('dead-letters permanent Notion failures without losing the lead', async () => {
    const { env, event, state, lead } = await fixture();
    notionMock(() => failure(403, 'restricted_resource'));
    const item = message(event('notion'));
    await consumeOutboxMessage(env, item);
    expect(item.ack).toHaveBeenCalled();
    expect(item.retry).not.toHaveBeenCalled();
    expect(await state()).toMatchObject({ status: 'dead', last_error_code: 'notion_rejected' });
    expect(await env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(lead.id).first()).toEqual({ id: lead.id });
  });

  it('reconciles an ambiguous Notion create by Lead ID without repeating create', async () => {
    const { env, event, state, due, lead } = await fixture();
    let visible = false;
    let creates = 0;
    notionMock((path, init) => {
      if (path.endsWith('/query')) return success({ results: visible ? [{ id: pageId }] : [] });
      if (init?.method === 'PATCH') return success({ id: pageId });
      creates++;
      throw new TypeError('connection lost after server commit');
    });
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'failed', last_error_code: 'notion_ambiguous_delivery' });
    expect((await state())?.ambiguous_since).toBeTruthy();
    await due();
    await consumeOutboxMessage(env, message(event('notion')));
    expect(creates).toBe(1);
    visible = true;
    await due();
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'completed', ambiguous_since: null });
    expect(await env.DB.prepare('SELECT notion_page_id FROM leads WHERE id=?').bind(lead.id).first()).toEqual({ notion_page_id: pageId });
    expect(creates).toBe(1);
  });

  it('persists Notion committed_resource_id returned with a 503', async () => {
    const { env, event, state, lead } = await fixture();
    notionMock((path) => path.endsWith('/query') ? success({ results: [] })
      : failure(503, 'service_unavailable', { additional_data: { committed_resource_id: pageId } }));
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'completed', ambiguous_since: null });
    expect(await env.DB.prepare('SELECT notion_page_id FROM leads WHERE id=?').bind(lead.id).first()).toEqual({ notion_page_id: pageId });
  });

  it('retains ambiguity after D1 fails to record a successful Notion create', async () => {
    const { env, event, state, due } = await fixture();
    const originalDb = env.DB;
    const originalBatch = originalDb.batch.bind(originalDb);
    let batches = 0;
    env.DB = new Proxy(originalDb, { get(target, property) {
      if (property === 'batch') return async (statements: D1PreparedStatement[]) => {
        if (++batches === 2) throw new Error('storage transient failure');
        return originalBatch(statements);
      };
      const value: unknown = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    let creates = 0;
    notionMock((path) => {
      if (path.endsWith('/query')) return success({ results: creates ? [{ id: pageId }] : [] });
      if (path === '/v1/pages') creates++;
      return success({ id: pageId });
    });
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'failed', last_error_code: 'notion_ambiguous_delivery' });
    expect((await state())?.ambiguous_since).toBeTruthy();
    await due();
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'completed' });
    expect(creates).toBe(1);
  });

  it('keeps a newer revision pending when the older delivery finishes', async () => {
    const { env, event, state, lead } = await fixture();
    const statuses: string[] = [];
    notionMock(async (path: string, init?: RequestInit) => {
      if (path.endsWith('/query')) return success({ results: [] });
      statuses.push((JSON.parse(String(init?.body)) as { properties: { Status: { status: { name: string } } } }).properties.Status.status.name);
      if (path === '/v1/pages') {
        await env.DB.batch([
          env.DB.prepare("UPDATE leads SET status='QUALIFIED' WHERE id=?").bind(lead.id),
          env.DB.prepare("UPDATE outbox_events SET revision=revision+1 WHERE aggregate_id=? AND destination='notion'").bind(lead.id),
        ]);
      }
      return success({ id: pageId });
    });
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'pending', attempts: 0 });
    await consumeOutboxMessage(env, message(event('notion')));
    expect(statuses).toEqual(['NEW', 'QUALIFIED']);
    expect(await state()).toMatchObject({ status: 'completed' });
  });

  it('fences an old consumer from overwriting a newer lease', async () => {
    const { env, event, state } = await fixture();
    notionMock(async (path) => {
      if (path.endsWith('/query')) return success({ results: [] });
      await env.DB.prepare("UPDATE outbox_events SET lease_token='new-owner',attempts=2 WHERE destination='notion'").run();
      return success({ id: pageId });
    });
    await consumeOutboxMessage(env, message(event('notion')));
    expect(await state()).toMatchObject({ status: 'processing', attempts: 2, lease_token: 'new-owner' });
    expect(await env.DB.prepare("SELECT status FROM integration_delivery_status WHERE destination='notion'").first()).toEqual({ status: 'processing' });
  });

  it('recovers expired Notion work but quarantines an uncertain Telegram send', async () => {
    const { env, state, send } = await fixture();
    await env.DB.prepare("UPDATE outbox_events SET status='processing',attempts=1,lease_token='expired',locked_until='2000-01-01T00:00:00.000Z',ambiguous_since='2000-01-01T00:00:00.000Z'").run();
    await recoverOutbox(env);
    expect(await state('telegram')).toMatchObject({ status: 'dead', last_error_code: 'telegram_ambiguous_delivery' });
    expect(await state()).toMatchObject({ status: 'queued', last_error_code: 'notion_ambiguous_delivery' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('stops after the bounded retry budget and preserves a durable dead-letter', async () => {
    const { env, event, state } = await fixture();
    await env.DB.prepare("UPDATE outbox_events SET attempts=4 WHERE destination='notion'").run();
    notionMock(() => failure(503, 'service_unavailable'));
    const item = message(event('notion'));
    await consumeOutboxMessage(env, item);
    expect(await state()).toMatchObject({ status: 'dead', attempts: 5, last_error_code: 'notion_unavailable' });
    expect(item.ack).toHaveBeenCalled();
    expect(item.retry).not.toHaveBeenCalled();
  });

  it('does not automatically repeat an ambiguous Telegram send', async () => {
    const { env, event, state, due } = await fixture();
    vi.mocked(notifyManager).mockRejectedValue(new Error('connection interrupted'));
    await consumeOutboxMessage(env, message(event('telegram')));
    await due();
    await consumeOutboxMessage(env, message(event('telegram')));
    expect(await state('telegram')).toMatchObject({ status: 'dead', last_error_code: 'telegram_ambiguous_delivery' });
    expect(notifyManager).toHaveBeenCalledTimes(1);
  });
});
