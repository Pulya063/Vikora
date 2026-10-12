import { Hono } from 'hono';
import { z } from 'zod';
import { claimTelegramUpdate, finishTelegramUpdate, isAdmin } from '../db/repositories/admin.repository';
import { HttpProblem, readJson, timingSafeEqual } from '../middleware/security';
import { createAdminBot } from '../services/telegram.service';
import type { Env } from '../types/env';

const positiveInteger = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const userSchema = z.object({ id: positiveInteger, is_bot: z.boolean(), first_name: z.string().max(256) }).passthrough();
const chatSchema = z.object({ id: positiveInteger, type: z.literal('private') }).passthrough();
const messageSchema = z.object({
  message_id: positiveInteger,
  date: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  chat: chatSchema,
  from: userSchema.optional(),
  text: z.string().max(4096).optional(),
  entities: z.array(z.object({ type: z.string().max(64), offset: z.number().int().nonnegative(), length: positiveInteger }).passthrough()).max(100).optional(),
}).passthrough();
export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  message: messageSchema.optional(),
  callback_query: z.object({
    id: z.string().min(1).max(256),
    from: userSchema,
    chat_instance: z.string().min(1).max(256),
    message: messageSchema,
    data: z.string().min(1).refine((value) => new TextEncoder().encode(value).length <= 64),
  }).strict().optional(),
}).strict().refine((update) => Boolean(update.message) !== Boolean(update.callback_query));
export const telegramRoutes = new Hono<{ Bindings: Env }>();

telegramRoutes.post('/webhook', async (context) => {
  if (context.req.header('origin') || context.req.header('sec-fetch-site')) throw new HttpProblem(403, 'Forbidden');
  const configured = context.env.TELEGRAM_WEBHOOK_SECRET;
  const supplied = context.req.header('x-telegram-bot-api-secret-token') ?? '';
  if (!configured || !timingSafeEqual(configured, supplied)) throw new HttpProblem(403, 'Forbidden');
  const parsed = telegramUpdateSchema.safeParse(await readJson(context));
  if (!parsed.success) throw new HttpProblem(422, 'Invalid Telegram update');
  const user = parsed.data.callback_query?.from ?? parsed.data.message?.from;
  const chat = parsed.data.callback_query?.message.chat ?? parsed.data.message?.chat;
  if (!user || user.is_bot || !chat || user.id !== chat.id || !await isAdmin(context.env.DB, user.id)) throw new HttpProblem(403, 'Forbidden');
  const claim = await claimTelegramUpdate(context.env.DB, parsed.data.update_id);
  if (claim.status === 'processed') return context.json({ ok: true, duplicate: true }, 200, { 'Cache-Control': 'no-store' });
  if (claim.status === 'busy') throw new HttpProblem(503, 'Telegram update in progress', 3);
  try {
    const bot = createAdminBot(context.env);
    // The supported subset has been runtime-validated; other official update kinds are rejected.
    await bot.handleUpdate(parsed.data as Parameters<typeof bot.handleUpdate>[0]);
    await finishTelegramUpdate(context.env.DB, parsed.data.update_id, claim.token, true);
    return context.json({ ok: true }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    await finishTelegramUpdate(context.env.DB, parsed.data.update_id, claim.token, false);
    throw new HttpProblem(503, 'Telegram update unavailable', 3);
  }
});
