export function getSetCookieValues(headers: Record<string, any>): string[] {
  const v = headers['set-cookie'];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [String(v)];
}

export function pickCookie(setCookie: string[], cookieName: string): { name: string; value: string } | null {
  for (const c of setCookie) {
    const m = c.match(new RegExp(`^${cookieName}=([^;]*)`));
    if (m) return { name: cookieName, value: m[1] ?? '' };
  }
  return null;
}

export function serializeCookies(pairs: Array<{ name: string; value: string }>): string {
  return pairs.map((p) => `${p.name}=${p.value}`).join('; ');
}
