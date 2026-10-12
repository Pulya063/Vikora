import type { PriceRow } from '../schema';

export async function listActivePrices(db: D1Database): Promise<PriceRow[]> {
  const result = await db.prepare(
    `SELECT id, category, key, label, value_micros, unit, active, version, updated_at
     FROM prices WHERE active = 1 ORDER BY category, key`,
  ).all<PriceRow>();
  return result.results;
}

export interface PublicContacts {
  phone: string | null;
  telegram: string | null;
  viber: string | null;
  email: string | null;
  address: string | null;
  version: number;
}

export async function getPublicContacts(db: D1Database): Promise<PublicContacts> {
  const result = await db.prepare(
    'SELECT key, value, version FROM contacts WHERE active = 1 ORDER BY key',
  ).all<{ key: keyof Omit<PublicContacts, 'version'>; value: string | null; version: number }>();
  const contacts: PublicContacts = { phone: null, telegram: null, viber: null, email: null, address: null, version: 0 };
  for (const row of result.results) {
    if (row.key in contacts) contacts[row.key] = row.value;
    contacts.version = Math.max(contacts.version, row.version);
  }
  return contacts;
}
