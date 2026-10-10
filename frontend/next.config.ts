import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() { return [{ source: '/api/v1/:path*', destination: `${process.env.API_URL || 'http://127.0.0.1:8000'}/api/v1/:path*` }]; },
  async headers() { return [{ source: '/:path*', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default (phase: string): NextConfig => ({
  ...config,
  // Keep live development assets separate from production builds.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? (process.env.NEXT_DEV_DIST_DIR || '.next-dev') : '.next',
});
