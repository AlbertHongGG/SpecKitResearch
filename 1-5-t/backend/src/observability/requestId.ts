import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export function registerRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    request.requestId = requestId;
    reply.header('x-request-id', requestId);
  });
}
