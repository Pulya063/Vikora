export type PublicContacts = {
  phone: string | null; telegram: string | null; viber: string | null;
  email: string | null; address: string | null; version: number;
};
export type ContactsSnapshot = {contacts: PublicContacts; stale: boolean; fetchedAt: number};
export const emptyContacts: PublicContacts = {phone:null,telegram:null,viber:null,email:null,address:null,version:0};
export const legacyBackend = process.env.NEXT_PUBLIC_BACKEND_MODE === 'legacy';
export const publicPaths = {
  contacts: legacyBackend ? '/api/v1/contact-information' : '/api/contacts',
  leads: legacyBackend ? '/api/v1/quote-requests' : '/api/leads',
  prices: '/api/prices', estimate: '/api/v1/calculator/estimate',
};
export function apiUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')}${path}`;
}
export function parsePublicContacts(value: unknown, legacy = legacyBackend): PublicContacts {
  if (!value || typeof value !== 'object') throw new Error('contacts_invalid');
  const outer = value as Record<string, unknown>;
  const source = (legacy ? outer.contacts : outer) as Record<string, unknown>;
  if (!source || typeof source !== 'object') throw new Error('contacts_invalid');
  const result = {...emptyContacts};
  for (const key of ['phone','telegram','viber','email','address'] as const) {
    const item = source[key];
    if (item !== null && (typeof item !== 'string' || item.length > 500 || /[\u0000-\u001f\u007f]/u.test(item))) throw new Error('contacts_invalid');
    result[key] = item as string | null;
  }
  if (result.phone && !/^\+380\d{9}$/.test(result.phone.replace(/[\s()-]/g,''))) throw new Error('contacts_invalid');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('contacts_invalid');
  if (result.telegram && !/^(https:\/\/t\.me\/[a-zA-Z0-9_]+|tg:\/\/resolve\?(?:phone=%2B380\d{9}|domain=[a-zA-Z0-9_]+))$/.test(result.telegram)) throw new Error('contacts_invalid');
  if (result.viber && !/^viber:\/\/chat\?number=%2B380\d{9}$/.test(result.viber)) throw new Error('contacts_invalid');
  if (!legacy && (!Number.isSafeInteger(source.version) || (source.version as number) < 0)) throw new Error('contacts_invalid');
  result.version = legacy ? 0 : source.version as number;
  return result;
}
