import { randomBytes } from 'crypto';

export const API_KEY_PREFIX = 'ak';

export type ApiKeyParts = {
  publicId: string;
  secret: string;
};

export type GeneratedApiKey = ApiKeyParts & {
  plaintext: string;
};

function randomBase64Url(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

export function generateApiKey(): GeneratedApiKey {
  const publicId = randomBase64Url(9);
  const secret = randomBase64Url(32);
  const plaintext = `${API_KEY_PREFIX}_${publicId}_${secret}`;

  return { plaintext, publicId, secret };
}

export function parseApiKey(input: string): ApiKeyParts | null {
  if (!input) return null;

  // NOTE: We intentionally avoid `split('_')` because base64url output may contain
  // underscores, which would make parsing ambiguous and cause intermittent auth failures.
  // The lengths are fixed by the generateApiKey() byte sizes:
  // - publicId: randomBase64Url(9)  => 12 chars
  // - secret:   randomBase64Url(32) => 43 chars
  const match = input.match(/^ak_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{43})$/);
  if (!match) return null;

  const publicId = match[1]!;
  const secret = match[2]!;
  return { publicId, secret };
}
