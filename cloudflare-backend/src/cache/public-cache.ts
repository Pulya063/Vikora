// Public contacts and prices change only through the Telegram admin bot (webhook).
// They are served from the Workers Cache API and purged by the webhook after an
// admin update, so visitors never hit D1 on every page view. The TTL is only a
// safety net for other colos: Cache API purges are local to the purging colo.
const CACHE_NAME = 'vikora-public';
const ORIGIN = 'https://public-cache.vikora.internal';
export const PUBLIC_CACHE_TTL_SECONDS = 300;
export const publicCacheKeys = {
  contacts: `${ORIGIN}/contacts`,
  prices: `${ORIGIN}/prices`,
} as const;

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function cachedJson<T>(key: string, load: () => Promise<T>, ttl = PUBLIC_CACHE_TTL_SECONDS): Promise<T> {
  const cache = await openCache();
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit.json() as Promise<T>;
  const value = await load();
  await cache?.put(key, new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
  })).catch(() => undefined);
  return value;
}

export async function purgePublicCache(): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  await Promise.all(Object.values(publicCacheKeys).map((key) => cache.delete(key).catch(() => false)));
}
