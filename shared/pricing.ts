import products from './catalog/products.json';

const MICRO = 1_000_000n;
const STRUCTURE_DENOMINATOR = MICRO ** 4n;
const QUOTE_ONLY = new Set(['hidden_hardware']);

export class PricingInputError extends Error {}

export type PricingConfiguration = {
  product_type: 'window';
  profile: string;
  dimensions: { width_mm: number; height_mm: number };
  construction: 'fixed' | 'single' | 'double' | 'triple';
  sections: number;
  opening: Array<'fixed' | 'turn' | 'tilt_turn'>;
  glass_unit: string;
  color: 'white';
  extras: string[];
  services_requested: { delivery: boolean; installation: boolean };
};

export type PublicPrices = {
  currency: 'UAH';
  is_mock: boolean;
  pricing_version: string;
  rules: Record<string, Record<string, number>>;
};

function decimalToMicros(value: number): bigint {
  if (!Number.isFinite(value) || value < 0) throw new Error('Ціна цієї комплектації тимчасово недоступна');
  const micros = Math.round(value * Number(MICRO));
  if (!Number.isSafeInteger(micros)) throw new Error('Ціна цієї комплектації тимчасово недоступна');
  return BigInt(micros);
}

function rule(prices: PublicPrices, category: string, key: string): bigint {
  const value = prices.rules[category]?.[key];
  if (value === undefined) throw new Error('Ціна цієї комплектації тимчасово недоступна');
  return decimalToMicros(value);
}

function roundRational(numerator: bigint, denominator: bigint, halfEven = false): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || (remainder * 2n === denominator && (!halfEven || quotient % 2n === 1n))) return quotient + 1n;
  return quotient;
}

function rationalUahToCents(microUahNumerator: bigint, denominator: bigint): number {
  // Python Decimal uses HALF_EVEN for the displayed .01 structure breakdown.
  return Number(roundRational(microUahNumerator * 100n, denominator * MICRO, true)) / 100;
}

export function calculatePrice<T extends PricingConfiguration>(configuration: T, prices: PublicPrices) {
  const product = products.find((item) => item.id === configuration.profile);
  if (!product) throw new PricingInputError('Оберіть доступну профільну систему');
  if (!product.glassOptions.includes(configuration.glass_unit)) throw new PricingInputError('Склопакет потребує уточнення сумісності');
  if (configuration.extras.some((item) => !product.compatibleOptions.includes(item))) throw new PricingInputError('Опція потребує перевірки менеджера');
  if ((configuration.extras.includes('child_lock') || configuration.extras.includes('hidden_hardware'))
      && configuration.opening.every((item) => item === 'fixed')) {
    throw new PricingInputError('Обрана фурнітура потребує відкривної стулки');
  }

  const areaPrice = rule(prices, 'base', 'area');
  const structureNumerator = areaPrice
    * BigInt(configuration.dimensions.width_mm)
    * BigInt(configuration.dimensions.height_mm)
    * rule(prices, 'construction', configuration.construction)
    * rule(prices, 'profile', configuration.profile)
    * rule(prices, 'glass', configuration.glass_unit);
  const openingMicros = configuration.opening.reduce(
    (sum, item) => sum + rule(prices, 'opening', item),
    0n,
  );
  const accessoriesMicros = configuration.extras
    .filter((item) => !QUOTE_ONLY.has(item))
    .reduce((sum, item) => sum + rule(prices, 'accessory', item), 0n);
  const additionsMicros = openingMicros + accessoriesMicros;
  const subtotalNumerator = structureNumerator + additionsMicros * STRUCTURE_DENOMINATOR;
  const minimumMicros = rule(prices, 'base', 'minimum');
  const minimumNumerator = minimumMicros * STRUCTURE_DENOMINATOR;
  const totalNumerator = subtotalNumerator > minimumNumerator ? subtotalNumerator : minimumNumerator;

  return {
    estimated_product_price_uah: Number(roundRational(totalNumerator, STRUCTURE_DENOMINATOR * MICRO)),
    currency: prices.currency,
    is_mock: prices.is_mock,
    pricing_version: prices.pricing_version,
    breakdown: {
      structure: rationalUahToCents(structureNumerator, STRUCTURE_DENOMINATOR),
      opening: Number(openingMicros) / Number(MICRO),
      accessories: Number(accessoriesMicros) / Number(MICRO),
      minimum_applied: minimumNumerator > subtotalNumerator,
    },
    configuration,
    supplier: product.supplier,
  };
}
