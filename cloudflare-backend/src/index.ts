import { Hono } from 'hono';
import { recoverOutbox, consumeOutboxMessage } from './jobs/outbox';
import { HttpProblem, securityHeaders, strictCors } from './middleware/security';
import { publicRoutes } from './routes/public';
import { telegramRoutes } from './routes/telegram';
import type { Env, QueueEventMessage } from './types/env';

export const app = new Hono<{ Bindings: Env }>();
app.use('*', securityHeaders());
app.use('/api/*', strictCors());
app.get('/health', async (context) => {
  await context.env.DB.prepare('SELECT 1').first();
  return context.json({ status: 'ok' }, 200, { 'Cache-Control': 'no-store' });
});
app.route('/api', publicRoutes);
app.route('/internal/telegram', telegramRoutes);
app.notFound((context) => context.json({ detail: 'Not found' }, 404, { 'Cache-Control': 'no-store' }));
app.onError((error, context) => {
  if (error instanceof HttpProblem) {
    if (error.retryAfter) context.header('Retry-After', String(error.retryAfter));
    return context.json({ detail: error.message }, error.status as 400, { 'Cache-Control': 'no-store' });
  }
  return context.json({ detail: 'Сервіс тимчасово недоступний. Спробуйте пізніше.' }, 503, { 'Cache-Control': 'no-store', 'Retry-After': '3' });
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<QueueEventMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try { await consumeOutboxMessage(env, message); }
      catch { message.retry({ delaySeconds: 60 }); }
    }
  },
  // Hourly safety net only. Telegram updates arrive via webhook (stale leases are
  // re-claimed when Telegram redelivers), and leads are dispatched on creation.
  // When there is nothing to repair this costs one read and zero writes.
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil(runMaintenance(env));
  },
};

export async function runMaintenance(env: Env): Promise<void> {
  const now = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
  const due = await env.DB.prepare(`SELECT
      EXISTS(SELECT 1 FROM outbox_events WHERE (status='processing' AND locked_until<=${now})
        OR (status IN ('pending','failed') AND available_at<=${now})
        OR (status='queued' AND updated_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-10 minutes'))) AS outbox,
      EXISTS(SELECT 1 FROM rate_limits WHERE expires_at < unixepoch('now')) AS rate_limits`)
    .first<{ outbox: number; rate_limits: number }>();
  if (due?.outbox) await recoverOutbox(env);
  if (due?.rate_limits) await env.DB.prepare(`DELETE FROM rate_limits WHERE expires_at < unixepoch('now')`).run();
}
