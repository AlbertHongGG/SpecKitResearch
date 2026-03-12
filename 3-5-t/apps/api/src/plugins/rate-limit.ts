import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => req.ip,
  });
};
