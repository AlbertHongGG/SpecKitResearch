import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { TooManyRequestsError } from '../httpErrors.js';

type Bucket = { count: number; resetAt: number };

function now() {
    return Date.now();
}

export function createFixedWindowRateLimiter(params: {
    windowMs: number;
    max: number;
    key: (req: FastifyRequest) => string;
}) {
    const buckets = new Map<string, Bucket>();

    const cleanup = () => {
        const t = now();
        for (const [k, b] of buckets) {
            if (b.resetAt <= t) buckets.delete(k);
        }
    };

    // Best-effort cleanup.
    setInterval(cleanup, Math.max(1_000, Math.min(60_000, params.windowMs))).unref?.();

    return async (req: FastifyRequest, reply: FastifyReply) => {
        const key = params.key(req);
        const t = now();
        const b = buckets.get(key);

        if (!b || b.resetAt <= t) {
            buckets.set(key, { count: 1, resetAt: t + params.windowMs });
            return;
        }

        b.count += 1;
        if (b.count <= params.max) return;

        const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - t) / 1000));
        reply.header('Retry-After', String(retryAfterSeconds));
        throw new TooManyRequestsError(`Too many requests. Try again in ${retryAfterSeconds}s.`);
    };
}

export const rateLimitPlugin: FastifyPluginAsync = fp(async (app) => {
    // Decorate reusable limiters.
    app.decorate('rateLimitLogin', createFixedWindowRateLimiter({
        windowMs: 5 * 60 * 1000,
        max: 10,
        key: (req) => `login:${req.ip}`,
    }));

    app.decorate('rateLimitRefresh', createFixedWindowRateLimiter({
        windowMs: 5 * 60 * 1000,
        max: 30,
        key: (req) => `refresh:${req.ip}`,
    }));
});

declare module 'fastify' {
    interface FastifyInstance {
        rateLimitLogin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
        rateLimitRefresh: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export default rateLimitPlugin;
