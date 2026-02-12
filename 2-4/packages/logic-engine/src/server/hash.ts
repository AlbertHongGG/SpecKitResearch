import { createHash } from 'node:crypto';
import { canonicalStringify } from './canonicalJson.js';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function computePublishHash(schema: unknown): string {
  const canonical = canonicalStringify(schema);
  return `sha256:${sha256Hex(canonical)}`;
}

export function computeResponseHash(payload: unknown): string {
  const canonical = canonicalStringify(payload);
  return `sha256:${sha256Hex(canonical)}`;
}
