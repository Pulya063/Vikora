import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    const api = process.env.API_URL || 'http://127.0.0.1:8000';
    // Only the website's public contract. Never proxy Telegram/internal APIs.
    return [
      'products', 'products/:productId', 'products/:productId/options',
      'contact-information', 'technologies', 'calculator/options',
      'calculator/estimate', 'quote-requests',
    ].map(path => ({source: `/api/v1/${path}`, destination: `${api}/api/v1/${path}`}));
  },
  async headers() { return [{ source: '/:path*', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default (phase: string): NextConfig => ({
  ...config,
  // Keep live development assets separate from production builds.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? (process.env.NEXT_DEV_DIST_DIR || '.next-dev') : '.next',
});
