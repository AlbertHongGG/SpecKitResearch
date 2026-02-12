import type { IncomingMessage } from 'http';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export function genReqId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  if (typeof incoming === 'string') {
    const trimmed = incoming.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 128);
  }
  return randomUUID();
}

export async function registerRequestIdPropagation(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    return payload;
  });
}
