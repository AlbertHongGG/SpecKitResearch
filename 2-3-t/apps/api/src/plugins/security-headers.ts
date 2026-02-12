import type { FastifyPluginAsync } from 'fastify';

export const securityHeadersPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onSend', async (_req, reply, payload) => {
    // Baseline hardening for an API server. Keep this conservative to avoid breaking dev tooling.
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'same-origin');
    reply.header('permissions-policy', 'geolocation=(), microphone=(), camera=()');
    reply.header('cross-origin-opener-policy', 'same-origin');
    reply.header('cross-origin-resource-policy', 'same-site');

    // CSP isn't very meaningful for JSON responses, but helps prevent accidental HTML rendering.
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    // Only set HSTS when we're confident we are on HTTPS.
    const env = (app.config as any)?.NODE_ENV as string | undefined;
    if (env === 'production') {
      reply.header('strict-transport-security', 'max-age=15552000; includeSubDomains');
    }

    return payload;
  });
};
