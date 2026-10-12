import { describe, expect, it } from 'vitest';
import { calculateEstimate as calculateWorker, publicPrices } from '../src/services/prices.service';
import { configurationSchema, idempotencyKeySchema, leadSchema } from '../src/validation';
import type { PriceRow } from '../src/db/schema';
import { calculateEstimate as calculateFrontend } from '../../frontend/src/lib/pricing';

const configuration = {
  product_type: 'window' as const,
  profile: 'grand-pro',
  dimensions: { width_mm: 1400, height_mm: 1200 },
  construction: 'double' as const,
  sections: 2,
  opening: ['fixed', 'tilt_turn'] as const,
  glass_unit: 'energy_saving' as const,
  color: 'white' as const,
  extras: ['warm_edge'],
  services_requested: { delivery: false, installation: false },
};

const values: Array<[string, string, number]> = [
  ['base', 'area', 3_500_000_000], ['base', 'minimum', 3_000_000_000],
  ['construction', 'double', 1_120_000], ['profile', 'grand-pro', 1_000_000],
  ['glass', 'energy_saving', 1_120_000], ['opening', 'fixed', 0],
  ['opening', 'tilt_turn', 1_400_000_000], ['accessory', 'warm_edge', 450_000_000],
];
const rows: PriceRow[] = values.map(([category, key, value_micros], index) => ({
  id: index + 1, category, key, label: key, value_micros, unit: '', active: 1, version: 1, updated_at: '',
}));

describe('public contracts', () => {
  it('keeps frontend and Worker pricing identical', async () => {
    const prices = await publicPrices(rows);
    const parsed = configurationSchema.parse(configuration);
    const worker = calculateWorker(parsed, prices);
    const frontend = calculateFrontend(parsed, prices);
    expect(frontend).toEqual({
      estimated_product_price_uah: worker.estimated_product_price_uah,
      currency: worker.currency,
      is_mock: worker.is_mock,
      pricing_version: worker.pricing_version,
      configuration: worker.configuration,
    });
  });

  it('normalizes the current frontend lead and rejects extra fields', () => {
    const input = {
      name: 'Тестова заявка', phone: '(067) 123-45-67', email: null, city: 'Вінниця',
      preferred_contact: 'phone', contact_handle: '', comment: "O'Brien; DROP TABLE leads;--",
      configuration, pricing_version: '0123456789abcdef', needs_delivery: true,
      needs_installation: false, consent: true, website: '', turnstile_token: 'local-bypass',
    };
    expect(leadSchema.parse(input).phone).toBe('+380671234567');
    expect(leadSchema.safeParse({ ...input, status: 'CLOSED' }).success).toBe(false);
  });

  it('rejects inconsistent configurations and malformed idempotency keys', () => {
    expect(configurationSchema.safeParse({ ...configuration, sections: 3 }).success).toBe(false);
    expect(idempotencyKeySchema.safeParse("x' OR 1=1").success).toBe(false);
  });
});
