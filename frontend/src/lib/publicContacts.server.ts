import 'server-only';
import {cache} from 'react';
import {connection} from 'next/server';
import {emptyContacts, legacyBackend, parsePublicContacts, publicPaths, type ContactsSnapshot} from './publicApi';

// No Next data cache: contacts must refresh without requiring an R2/ISR cache.
export const loadPublicContacts = cache(async (): Promise<ContactsSnapshot> => {
  await connection();
  const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? `http://127.0.0.1:${legacyBackend ? '8000' : '8787'}` : '')).replace(/\/$/, '');
  try {
    if (!base) throw new Error('api_unconfigured');
    const response = await fetch(`${base}${publicPaths.contacts}`, {cache:'no-store', signal:AbortSignal.timeout(3000)});
    if (!response.ok) throw new Error('contacts_unavailable');
    return {contacts:parsePublicContacts(await response.json()), stale:false, fetchedAt:Date.now()};
  } catch {return {contacts:emptyContacts, stale:true, fetchedAt:0};}
});
