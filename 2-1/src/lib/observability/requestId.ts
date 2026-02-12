import { headers } from 'next/headers';
import { randomUUID } from 'crypto';

export async function getRequestId(): Promise<string> {
  const h = await headers();
  const fromHeader = h.get('x-request-id');
  if (fromHeader) return fromHeader;
  return randomUUID();
}
