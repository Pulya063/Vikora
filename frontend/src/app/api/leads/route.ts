import { proxyToBackend } from '../../../lib/backendProxy';

export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return proxyToBackend(request, 'leads');
}
