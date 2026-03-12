export function parseBearerToken(authHeader: unknown): { keyId: string; secret: string } | null {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  const parts = token.split('_');
  if (parts.length < 3) return null;
  if (parts[0] !== 'sk') return null;
  const keyId = parts[1];
  const secret = parts.slice(2).join('_');
  if (!keyId || !secret) return null;
  return { keyId, secret };
}
