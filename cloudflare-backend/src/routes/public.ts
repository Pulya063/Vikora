import { Hono } from 'hono';
import { z } from 'zod';
import { PricingInputError } from '../../../shared/pricing';
import { getPublicContacts, listActivePrices } from '../db/repositories/public.repository';
import { createLead, findIdempotentLead, IdempotencyConflictError, leadRequestHash, PriceChangedError } from '../db/repositories/leads.repository';
import { enforceRateLimit, HttpProblem, readJson, verifyTurnstile } from '../middleware/security';
import { publicPrices } from '../services/prices.service';
import type { Env } from '../types/env';
import { idempotencyKeySchema, leadSchema } from '../validation';

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/prices', async (context) => {
  await enforceRateLimit(context, 'prices', 120);
  const payload = await publicPrices(await listActivePrices(context.env.DB));
  return context.json(payload, 200, { 'Cache-Control': 'public, max-age=30, s-maxage=60' });
});

publicRoutes.get('/contacts', async (context) => {
  await enforceRateLimit(context, 'contacts', 120);
  return context.json(await getPublicContacts(context.env.DB), 200, {
    'Cache-Control': 'public, max-age=30, s-maxage=60',
  });
});

publicRoutes.post('/leads', async (context) => {
  if ((context.env.APP_ENV === 'production' || context.env.APP_ENV === 'staging') && new URL(context.req.url).protocol !== 'https:') {
    throw new HttpProblem(400, 'Для надсилання даних потрібне HTTPS-з’єднання');
  }
  const origin = context.req.header('origin');
  const allowed = new Set(context.env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()));
  if (origin && !allowed.has(origin)) throw new HttpProblem(403, 'Недозволене джерело запиту');
  await enforceRateLimit(context, 'leads', 8);
  const idempotencyKey = idempotencyKeySchema.safeParse(context.req.header('idempotency-key'));
  if (!idempotencyKey.success) throw new HttpProblem(422, 'Некоректний Idempotency-Key');
  const parsed = leadSchema.safeParse(await readJson(context));
  if (!parsed.success) {
    return context.json({
      detail: 'Перевірте заповнені поля.',
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    }, 422, { 'Cache-Control': 'no-store' });
  }
  try {
    const requestHash = await leadRequestHash(parsed.data);
    const existing = await findIdempotentLead(context.env.DB, idempotencyKey.data, requestHash);
    if (existing) {
      return context.json({ public_id: existing.public_id, status: existing.status, message: 'Заявку збережено' }, 200, { 'Cache-Control': 'no-store' });
    }
    await verifyTurnstile(context, parsed.data.turnstile_token);
    const priceRows = await listActivePrices(context.env.DB);
    const result = await createLead(context.env.DB, parsed.data, idempotencyKey.data, priceRows);
    return context.json({ public_id: result.lead.public_id, status: result.lead.status, message: 'Заявку збережено' }, result.created ? 201 : 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    if (error instanceof PriceChangedError) return context.json({ detail: error.message, estimate: error.estimate }, 409, { 'Cache-Control': 'no-store' });
    if (error instanceof IdempotencyConflictError) return context.json({ detail: error.message }, 409, { 'Cache-Control': 'no-store' });
    if (error instanceof PricingInputError) throw new HttpProblem(422, error.message);
    if (error instanceof z.ZodError) throw new HttpProblem(422, 'Некоректна конфігурація');
    throw error;
  }
});
