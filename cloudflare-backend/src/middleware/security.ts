import type { Context, MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types/env';

type AppContext = { Bindings: Env };
const MAX_BODY = 32 * 1024;

export function securityHeaders(): MiddlewareHandler<AppContext> {
  return async (context, next) => {
    await next();
    context.header('X-Content-Type-Options', 'nosniff');
    context.header('X-Frame-Options', 'DENY');
    context.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    context.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    context.header('Cross-Origin-Resource-Policy', 'same-site');
    context.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (context.env.APP_ENV === 'production' || context.env.APP_ENV === 'staging') {
      context.header('Strict-Transport-Security', 'max-age=31536000');
    }
  };
}

export function strictCors(): MiddlewareHandler<AppContext> {
  return cors({
    origin: (origin, context) => allowedOrigins(context.env).has(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Idempotency-Key'],
    maxAge: 600,
  });
}

export function allowedOrigins(env: Env): Set<string> {
  return new Set(env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean));
}

export async function readJson(context: Context<AppContext>): Promise<unknown> {
  const type = context.req.header('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (type !== 'application/json') throw new HttpProblem(415, 'Потрібен application/json');
  if (context.req.header('content-encoding')) throw new HttpProblem(415, 'Стиснені запити не підтримуються');
  const declared = Number(context.req.header('content-length') ?? 0);
  if (!Number.isSafeInteger(declared) || declared < 0) throw new HttpProblem(400, 'Некоректна довжина запиту');
  if (declared > MAX_BODY) throw new HttpProblem(413, 'Запит завеликий');
  const reader = context.req.raw.body?.getReader();
  if (!reader) throw new HttpProblem(422, 'Некоректний JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new HttpProblem(408, 'Час читання запиту вичерпано')); }, 10_000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new HttpProblem(413, 'Запит завеликий');
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { throw new HttpProblem(422, 'Некоректний JSON'); }
}

export class HttpProblem extends Error {
  constructor(readonly status: number, message: string, readonly retryAfter?: number) { super(message); }
}

async function hash(value: string): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(result)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export async function enforceRateLimit(context: Context<AppContext>, kind: string, maximum: number): Promise<void> {
  const address = context.req.header('cf-connecting-ip') ?? 'local';
  const key = `${context.env.APP_ENV}:${kind}:${await hash(address)}`;
  const edgeLimiter = kind === 'leads' ? context.env.LEAD_RATE_LIMITER : context.env.PUBLIC_RATE_LIMITER;
  if (edgeLimiter) {
    if (!(await edgeLimiter.limit({ key })).success) throw new HttpProblem(429, 'Забагато запитів. Спробуйте за хвилину.', 60);
    if (kind !== 'leads') return;
  } else if (context.env.APP_ENV === 'production' || context.env.APP_ENV === 'staging') {
    throw new HttpProblem(503, 'Захист API тимчасово не налаштований', 30);
  }
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / 60);
  const row = await context.env.DB.prepare(
    `INSERT INTO rate_limits(key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  ).bind(key, windowStart, now + 120).first<{ count: number }>();
  if ((row?.count ?? maximum + 1) > maximum) throw new HttpProblem(429, 'Забагато запитів. Спробуйте за хвилину.', 60);
}

export async function verifyTurnstile(context: Context<AppContext>, token: string): Promise<void> {
  if (context.env.APP_ENV !== 'production' && context.env.APP_ENV !== 'staging' && context.env.TURNSTILE_BYPASS === 'true') return;
  if (!context.env.TURNSTILE_SECRET) throw new HttpProblem(503, 'Захист форми тимчасово не налаштований', 30);
  const form = new FormData();
  form.set('secret', context.env.TURNSTILE_SECRET);
  form.set('response', token);
  form.set('idempotency_key', crypto.randomUUID());
  const ip = context.req.header('cf-connecting-ip');
  if (ip) form.set('remoteip', ip);
  let response: Response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new HttpProblem(503, 'Перевірка форми тимчасово недоступна', 10);
  }
  if (!response.ok) throw new HttpProblem(503, 'Перевірка форми тимчасово недоступна', 10);
  const json: unknown = await response.json().catch(() => null);
  const result = json && typeof json === 'object' ? json as { success?: boolean; action?: string; hostname?: string } : {};
  const allowedHosts = new Set([...allowedOrigins(context.env)].flatMap((origin) => {
    try { return [new URL(origin).hostname]; } catch { return []; }
  }));
  if (result.success !== true || result.action !== 'lead' || !result.hostname || !allowedHosts.has(result.hostname)) {
    throw new HttpProblem(403, 'Перевірка форми не пройдена');
  }
}

export function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) mismatch |= (a[index % a.length] ?? 0) ^ (b[index % b.length] ?? 0);
  return mismatch === 0;
}
