import { z } from 'zod';

const safeText = (max: number) => z.string().max(max).refine(
  (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uD800-\uDFFF]/u.test(value),
  'Текст містить недопустимі символи',
);

export const configurationSchema = z.object({
  product_type: z.literal('window').default('window'),
  profile: safeText(80),
  dimensions: z.object({ width_mm: z.number().int().min(400).max(3000), height_mm: z.number().int().min(400).max(2400) }).strict(),
  construction: z.enum(['fixed', 'single', 'double', 'triple']).default('double'),
  sections: z.number().int().min(1).max(3),
  opening: z.array(z.enum(['fixed', 'turn', 'tilt_turn'])).min(1).max(3),
  glass_unit: z.enum(['standard', 'energy_saving', 'solar_control']),
  color: z.literal('white').default('white'),
  extras: z.array(safeText(80)).max(6).default([]),
  services_requested: z.object({ delivery: z.boolean().default(false), installation: z.boolean().default(false) }).strict().default({ delivery: false, installation: false }),
}).strict().superRefine((value, ctx) => {
  const expected = { fixed: 1, single: 1, double: 2, triple: 3 }[value.construction];
  if (value.sections !== expected || value.opening.length !== expected) ctx.addIssue({ code: 'custom', message: 'Кількість секцій не відповідає конструкції' });
  if (value.construction === 'fixed' && value.opening[0] !== 'fixed') ctx.addIssue({ code: 'custom', message: 'Глухе вікно не відкривається' });
  if (new Set(value.extras).size !== value.extras.length) ctx.addIssue({ code: 'custom', message: 'Опції не можуть повторюватися' });
  const sashWidth = value.dimensions.width_mm / value.sections;
  if (sashWidth < 400 || sashWidth > 1500) ctx.addIssue({ code: 'custom', message: 'Ширина однієї секції має бути від 400 до 1500 мм' });
  if (value.opening.some((item) => item !== 'fixed') && sashWidth * value.dimensions.height_mm > 2_250_000) ctx.addIssue({ code: 'custom', message: 'Для такої площі відкривної стулки потрібен розрахунок менеджера' });
});

export const leadSchema = z.object({
  name: safeText(100).trim().min(2),
  phone: safeText(40).transform((value, ctx) => {
    let normalized = value.replace(/[\s()-]/g, '');
    if (/^0\d{9}$/.test(normalized)) normalized = `+38${normalized}`;
    if (!/^\+380\d{9}$/.test(normalized)) { ctx.addIssue({ code: 'custom', message: 'Вкажіть український номер +380XXXXXXXXX' }); return z.NEVER; }
    return normalized;
  }),
  email: z.union([z.email().max(254), z.null()]).default(null),
  city: safeText(120).trim().default(''),
  preferred_contact: z.enum(['phone', 'Telegram', 'Viber', 'WhatsApp', 'email']).default('phone'),
  contact_handle: safeText(100).trim().default(''),
  comment: safeText(2000).trim().default(''),
  configuration: configurationSchema.nullable().default(null),
  pricing_version: safeText(80).nullable().default(null),
  needs_delivery: z.boolean().default(false),
  needs_installation: z.boolean().default(false),
  consent: z.literal(true),
  website: z.literal('').default(''),
  turnstile_token: z.string().min(1).max(2048),
}).strict().superRefine((value, ctx) => {
  if (value.preferred_contact === 'email' && !value.email) ctx.addIssue({ code: 'custom', message: 'Для зв’язку електронною поштою вкажіть email', path: ['email'] });
  if (value.preferred_contact === 'Telegram' && !value.contact_handle) ctx.addIssue({ code: 'custom', message: 'Для Telegram вкажіть ім’я користувача', path: ['contact_handle'] });
});

export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_.:-]{8,80}$/);
export type Configuration = z.infer<typeof configurationSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
