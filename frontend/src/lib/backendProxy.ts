import { getCloudflareContext } from '@opennextjs/cloudflare';

// Proxies the public website contract to the API Worker.
// On Cloudflare: uses the BACKEND service binding (Worker -> Worker, no public internet).
// In local `next dev`: falls back to API_URL (default http://127.0.0.1:8787).
type ServiceBinding = { fetch(input: string, init?: RequestInit): Promise<Response> };

const FORWARD_REQUEST = ['accept', 'content-type', 'idempotency-key', 'origin', 'user-agent', 'cf-connecting-ip'];
const DROP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

function backendBinding(): ServiceBinding | undefined {
  try {
    return (getCloudflareContext().env as { BACKEND?: ServiceBinding }).BACKEND;
  } catch {
    return undefined;
  }
}

export async function proxyToBackend(request: Request, path: string): Promise<Response> {
  const search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit = {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
  };
  const binding = backendBinding();
  const base = binding ? 'https://backend.internal' : (process.env.API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
  const target = `${base}/api/${path}${search}`;
  try {
    const upstream = binding ? await binding.fetch(target, init) : await fetch(target, init);
    const responseHeaders = new Headers(upstream.headers);
    for (const name of DROP_RESPONSE) responseHeaders.delete(name);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { detail: 'Сервіс тимчасово недоступний. Спробуйте пізніше.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' } },
    );
  }
}
