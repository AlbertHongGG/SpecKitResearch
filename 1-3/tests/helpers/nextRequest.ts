import { NextRequest } from 'next/server';

type MakeRequestOptions = {
  method?: string;
  url: string;
  json?: unknown;
  headers?: Record<string, string | undefined>;
  cookie?: string;
  autoSameOriginHeaders?: boolean;
  host?: string;
  proto?: string;
};

export function makeNextRequest(opts: MakeRequestOptions): NextRequest {
  const method = (opts.method ?? 'GET').toUpperCase();
  const autoSameOriginHeaders = opts.autoSameOriginHeaders ?? true;

  const headers = new Headers();
  for (const [k, v] of Object.entries(opts.headers ?? {})) {
    if (typeof v === 'string') headers.set(k, v);
  }

  if (opts.cookie) headers.set('cookie', opts.cookie);

  if (autoSameOriginHeaders && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const host = opts.host ?? 'localhost:3000';
    const proto = opts.proto ?? 'http';
    headers.set('host', host);
    headers.set('x-forwarded-proto', proto);
    if (!headers.has('origin')) headers.set('origin', `${proto}://${host}`);
  }

  let body: string | undefined;
  if (opts.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(opts.json);
  }

  return new NextRequest(opts.url, {
    method,
    headers,
    body,
  });
}

export function extractCookieValue(setCookieHeader: string | null, cookieName: string): string | null {
  if (!setCookieHeader) return null;
  const m = setCookieHeader.match(new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)`));
  return m?.[1] ?? null;
}

export function makeCookieHeader(cookieName: string, value: string): string {
  return `${cookieName}=${value}`;
}
