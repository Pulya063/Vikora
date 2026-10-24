import { proxyToBackend } from '../../../lib/backendProxy';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return proxyToBackend(request, 'prices');
}
