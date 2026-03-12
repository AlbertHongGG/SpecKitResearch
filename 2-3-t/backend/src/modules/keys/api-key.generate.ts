import { randomBytes } from 'node:crypto';

const keyIdAlphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomAlphabetId(length: number) {
  // Rejection sampling to avoid modulo bias.
  const alphabet = keyIdAlphabet;
  const out: string[] = [];
  const max = Math.floor(256 / alphabet.length) * alphabet.length; // 252 for len=36

  while (out.length < length) {
    const buf = randomBytes(length);
    for (const b of buf) {
      if (b >= max) continue;
      out.push(alphabet[b % alphabet.length]);
      if (out.length === length) break;
    }
  }
  return out.join('');
}

export function generateApiKey() {
  const keyId = randomAlphabetId(12);
  const secret = randomBytes(24).toString('base64url');
  const last4 = secret.slice(-4);
  const token = `sk_${keyId}_${secret}`;
  return { keyId, secret, last4, token };
}
