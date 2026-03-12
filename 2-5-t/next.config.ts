import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const frontendOnly = process.env.FRONTEND_ONLY === "1";
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Use a separate build directory so frontend-only and backend dev servers can run together.
  distDir: frontendOnly ? ".next-frontend" : ".next",
  async rewrites() {
    if (!frontendOnly) return [];

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
