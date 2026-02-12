import type { NextConfig } from 'next';

function buildCsp() {
  const isDev = process.env.NODE_ENV !== 'production';

  // NOTE: Next dev server needs 'unsafe-eval'. Production should be stricter.
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
  const styleSrc = "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' http: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acme/contracts', '@acme/logic-engine'],
  async headers() {
    const csp = buildCsp();
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
