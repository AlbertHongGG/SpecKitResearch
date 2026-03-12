import type { Env } from '../config/env';

export function registerSecurityHeaders(fastify: any, env: Env): void {
  fastify.addHook('onSend', async (_request: any, reply: any, payload: any) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('permissions-policy', 'geolocation=(), microphone=(), camera=()');

    // API server: keep CSP strict; does not affect non-browser clients.
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    if (env.NODE_ENV === 'production') {
      reply.header('strict-transport-security', 'max-age=15552000; includeSubDomains');
    }

    return payload;
  });
}
