import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export const REQUEST_ID_HEADER = 'x-request-id';

export function getOrCreateRequestId(req: NextRequest): string {
  const existing = req.headers.get(REQUEST_ID_HEADER);
  return existing && existing.trim() ? existing : randomUUID();
}
