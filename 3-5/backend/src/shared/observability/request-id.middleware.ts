import type { FastifyReply, FastifyRequest } from 'fastify';

import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export function ensureRequestId(request: FastifyRequest, reply: FastifyReply): string {
  const existing = request.headers[REQUEST_ID_HEADER] as string | undefined;
  const requestId = existing && existing.trim().length > 0 ? existing.trim() : randomUUID();

  reply.header(REQUEST_ID_HEADER, requestId);
  (request as any).requestId = requestId;

  return requestId;
}
