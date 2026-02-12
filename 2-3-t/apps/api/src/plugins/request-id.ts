import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const header = req.headers['x-request-id'];
    const requestId = (typeof header === 'string' && header.trim() !== '') ? header : randomUUID();
    (req as any).requestId = requestId;
    reply.header('x-request-id', requestId);
  });
};
