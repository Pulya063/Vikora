import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    const legacy = process.env.NEXT_PUBLIC_BACKEND_MODE === 'legacy';
    // Cloudflare mode: /api/prices|contacts|leads are route handlers (src/app/api/*) using the BACKEND service binding.
    if (!legacy) return [];
    const api = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    // Only the website's public contract. Never proxy Telegram/internal APIs.
    const paths = ['v1/contact-information','v1/calculator/estimate','v1/quote-requests'];
    return paths.map(path => ({source: `/api/${path}`, destination: `${api}/api/${path}`}));
  },
  async headers() { return [{ source: '/:path*', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Strict-Transport-Security',value:'max-age=31536000'},
    {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default (phase: string): NextConfig => ({
  ...config,
  // Keep live development assets separate from production builds.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? (process.env.NEXT_DEV_DIST_DIR || '.next-dev') : '.next',
});
