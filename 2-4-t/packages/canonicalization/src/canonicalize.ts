import canonicalize from 'canonicalize';

export function canonicalizeJson(value: unknown): string {
  const result = canonicalize(value as any);
  if (typeof result !== 'string') {
    throw new Error('canonicalize failed');
  }
  return result;
}
