import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export async function registerRateLimit(app: FastifyInstance) {
  const isTest = process.env.NODE_ENV === 'test';

  await app.register(rateLimit, {
    global: false,
    // Keep tests deterministic: rate limiting is a production concern.
    allowList: () => isTest,
  });
}
