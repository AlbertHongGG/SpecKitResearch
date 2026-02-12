import { randomUUID } from 'node:crypto';

export type RequestId = string;

export function createRequestId(): RequestId {
  return `req_${randomUUID()}`;
}
