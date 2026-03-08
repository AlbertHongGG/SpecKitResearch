import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export const requestIdPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'];
    const id = typeof requestId === 'string' && requestId.trim() ? requestId : crypto.randomUUID();
    request.requestId = id;
    reply.header('x-request-id', id);
  });
});
