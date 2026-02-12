import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';

export const securityHeadersPlugin: FastifyPluginAsync = fp(async (app) => {
    await app.register(helmet, {
        // API-only service, but keep a safe baseline.
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
    });
});

export default securityHeadersPlugin;
