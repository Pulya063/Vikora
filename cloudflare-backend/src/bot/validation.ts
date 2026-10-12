import { z } from 'zod';

const text = z.string().trim().refine((value) => !/[\u0000-\u001f\u007f]/u.test(value));
export const contactKeySchema = z.enum(['phone', 'email', 'address', 'telegram', 'viber']);
export type ContactKey = z.infer<typeof contactKeySchema>;

function contactUrl(protocol: 'tg:' | 'viber:') {
  return text.pipe(z.url().max(500)).refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === 'https:' || url.protocol === protocol);
  });
}

export const contactValueSchemas: Record<ContactKey, z.ZodType<string | null>> = {
  phone: text.refine((value) => /^\+?[0-9 ()-]+$/.test(value) && /^[0-9]{10,15}$/.test(value.replace(/\D/g, ''))),
  email: text.pipe(z.email().max(254)),
  address: text.pipe(z.string().min(3).max(300)).nullable(),
  telegram: contactUrl('tg:'),
  viber: contactUrl('viber:'),
};

const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const priceSessionSchema = z.object({ id: version, version, old: z.number().int().nonnegative(), valueMicros: z.number().int().nonnegative().optional() });
export const contactSessionSchema = z.object({ key: contactKeySchema, version, old: z.string().nullable(), value: z.string().nullable().optional() });

/** Accept ordinary decimal input only; reject exponent, hex, whitespace and rounding ambiguity. */
export function parsePriceValue(input: string, coefficient: boolean): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,6}(?:\.\d{1,6})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (coefficient ? value < 0.1 || value > 10 : value < 0 || value > 100_000) return null;
  return Math.round(value * 1_000_000);
}
