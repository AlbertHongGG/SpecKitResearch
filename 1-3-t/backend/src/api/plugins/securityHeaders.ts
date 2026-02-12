import type { FastifyInstance } from 'fastify';

export async function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('permissions-policy', 'geolocation=(), microphone=(), camera=()');

    // API-only CSP baseline.
    reply.header(
      'content-security-policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );

    return payload;
  });
}
