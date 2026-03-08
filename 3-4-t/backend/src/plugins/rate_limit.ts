import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { ErrorCode } from '@app/contracts';
import fp from 'fastify-plugin';

type Bucket = {
  count: number;
  resetAtMs: number;
};

function nowMs() {
  return Date.now();
}

function getClientId(request: FastifyRequest) {
  return request.ip || request.headers['x-forwarded-for']?.toString() || request.socket.remoteAddress || 'unknown';
}

const plugin: FastifyPluginAsync = async (app) => {
  const buckets = new Map<string, Bucket>();

  app.decorate(
    'rateLimit',
    (opts: { key: string; limit: number; windowMs: number }): preHandlerHookHandler => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        const client = getClientId(request);
        const bucketKey = `${opts.key}:${client}`;
        const t = nowMs();

        const b = buckets.get(bucketKey);
        if (!b || t >= b.resetAtMs) {
          buckets.set(bucketKey, { count: 1, resetAtMs: t + opts.windowMs });
          return;
        }

        if (b.count >= opts.limit) {
          const retryAfterSec = Math.max(1, Math.ceil((b.resetAtMs - t) / 1000));
          reply.header('Retry-After', String(retryAfterSec));
          throw Object.assign(new Error('Too many requests'), {
            statusCode: 429,
            code: ErrorCode.RATE_LIMITED,
          });
        }

        b.count += 1;
      };
    },
  );
};

export const rateLimitPlugin = fp(plugin, { name: 'rateLimitPlugin' });

declare module 'fastify' {
  interface FastifyInstance {
    rateLimit: (opts: { key: string; limit: number; windowMs: number }) => preHandlerHookHandler;
  }
}
