function getCookie(name: string): string | null {
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

export function getCsrfToken(): string | null {
  return getCookie('csrf_token');
}

export function withCsrfHeaders(headers?: HeadersInit): HeadersInit {
  const token = getCsrfToken();
  return {
    ...(headers ?? {}),
    ...(token ? { 'X-CSRF-Token': token } : {}),
  };
}
