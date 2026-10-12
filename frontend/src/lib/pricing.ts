import {calculatePrice, type PublicPrices} from '../../../shared/pricing';
import type {Configuration, Estimate} from './types';
import {products} from './data';

export type {PublicPrices} from '../../../shared/pricing';

export function parseConfiguration(value:unknown):Configuration {
  const invalid=()=>{throw new Error('Перевірте комплектацію та розміри вікна')};
  if(!value||typeof value!=='object'||Array.isArray(value))return invalid();
  const c=value as Configuration;
  if(c.product_type!=='window'||c.color!=='white'||typeof c.profile!=='string'||!c.dimensions||!c.services_requested)return invalid();
  const n={fixed:1,single:1,double:2,triple:3}[c.construction];
  if(!n||c.sections!==n||!Array.isArray(c.opening)||c.opening.length!==n||c.opening.some(v=>!['fixed','turn','tilt_turn'].includes(v)))return invalid();
  if(c.construction==='fixed'&&c.opening[0]!=='fixed')return invalid();
  const {width_mm:w,height_mm:h}=c.dimensions;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<400||w>3000||h<400||h>2400||w/n<400||w/n>1500)return invalid();
  if(c.opening.some(v=>v!=='fixed')&&w/n*h>2250000)throw new Error('Для такої площі відкривної стулки потрібен розрахунок менеджера');
  if(!Array.isArray(c.extras)||c.extras.length>6||new Set(c.extras).size!==c.extras.length||typeof c.services_requested.delivery!=='boolean'||typeof c.services_requested.installation!=='boolean')return invalid();
  const product=products.find(p=>p.id===c.profile);
  if(!product||!product.glassOptions.includes(c.glass_unit)||c.extras.some(v=>!product.compatibleOptions.includes(v)))return invalid();
  if(c.extras.some(v=>['child_lock','hidden_hardware'].includes(v))&&c.opening.every(v=>v==='fixed'))throw new Error('Обрана фурнітура потребує відкривної стулки');
  // Rebuild the contract so injected sessionStorage properties are never forwarded.
  return {product_type:'window',profile:c.profile,dimensions:{width_mm:w,height_mm:h},construction:c.construction,sections:n,opening:[...c.opening],glass_unit:c.glass_unit,color:'white',extras:[...c.extras],services_requested:{delivery:c.services_requested.delivery,installation:c.services_requested.installation}};
}

export function parsePublicPrices(value: unknown): PublicPrices {
  if (!value || typeof value !== 'object') throw new Error('Некоректна відповідь сервісу цін');
  const candidate = value as Partial<PublicPrices>;
  if (candidate.currency !== 'UAH' || typeof candidate.is_mock !== 'boolean'
      || typeof candidate.pricing_version !== 'string' || !/^[0-9a-f]{16}$/.test(candidate.pricing_version)
      || !candidate.rules || typeof candidate.rules !== 'object' || Array.isArray(candidate.rules)) {
    throw new Error('Некоректна відповідь сервісу цін');
  }
  for (const rules of Object.values(candidate.rules)) {
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('Некоректна відповідь сервісу цін');
    for (const price of Object.values(rules)) {
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 100_000) throw new Error('Некоректна відповідь сервісу цін');
    }
  }
  return candidate as PublicPrices;
}

export function calculateEstimate(configuration: Configuration, prices: PublicPrices): Estimate {
  const result = calculatePrice(parseConfiguration(configuration), prices);
  return {
    estimated_product_price_uah: result.estimated_product_price_uah,
    currency: result.currency,
    is_mock: result.is_mock,
    pricing_version: result.pricing_version,
    configuration: result.configuration,
  };
}

export function parseEstimate(value: unknown): Estimate {
  if (!value || typeof value !== 'object') throw new Error('Некоректна відповідь сервісу розрахунку');
  const candidate = value as Partial<Estimate>;
  if (!Number.isSafeInteger(candidate.estimated_product_price_uah) || (candidate.estimated_product_price_uah ?? -1) < 0
      || candidate.currency !== 'UAH' || typeof candidate.is_mock !== 'boolean'
      || typeof candidate.pricing_version !== 'string' || !/^[0-9a-f]{16}$/.test(candidate.pricing_version)
      || !candidate.configuration || typeof candidate.configuration !== 'object') {
    throw new Error('Некоректна відповідь сервісу розрахунку');
  }
  return {...candidate, configuration:parseConfiguration(candidate.configuration)} as Estimate;
}
