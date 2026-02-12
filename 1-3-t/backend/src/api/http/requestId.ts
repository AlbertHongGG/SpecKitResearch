import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export async function registerRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming
        : `req_${nanoid(12)}`;

    request.requestId = requestId;
    reply.header('x-request-id', requestId);
  });
}
