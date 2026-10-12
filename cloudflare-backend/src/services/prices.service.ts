import { calculatePrice, type PublicPrices } from '../../../shared/pricing';
import type { PriceRow } from '../db/schema';
import type { Configuration } from '../validation';

const MICROS = 1_000_000;
export type { PublicPrices } from '../../../shared/pricing';

function bytesToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function publicPrices(rows: PriceRow[]): Promise<PublicPrices> {
  const active = rows.filter((row) => row.active === 1).sort((a, b) => `${a.category}:${a.key}`.localeCompare(`${b.category}:${b.key}`));
  const rules: Record<string, Record<string, number>> = {};
  for (const row of active) (rules[row.category] ??= {})[row.key] = row.value_micros / MICROS;
  const fingerprint = active.map((row) => `${row.category}:${row.key}:${row.value_micros}:${row.version}`).join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  return { currency: 'UAH', is_mock: true, pricing_version: bytesToHex(digest).slice(0, 16), rules };
}

export function calculateEstimate(configuration: Configuration, prices: PublicPrices) {
  return calculatePrice(configuration, prices);
}
