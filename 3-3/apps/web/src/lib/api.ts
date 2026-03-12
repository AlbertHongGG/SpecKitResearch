export type ApiError = {
  errorCode: string;
  message: string;
  requestId?: string;
};

function getLocalStorage(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[-./\\^$*+?()[\]{}|]/g, '\\$&')}=([^;]*)`),
  );
  return m ? decodeURIComponent(m[1]) : undefined;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { csrf?: boolean; orgId?: string } = {},
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3000';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(opts.headers);
  headers.set('Accept', 'application/json');

  const needsOrgHeader = path === '/app' || path.startsWith('/app/');
  if (needsOrgHeader && !headers.has('X-Organization-Id')) {
    const orgId = opts.orgId ?? getLocalStorage('activeOrgId');
    if (orgId) headers.set('X-Organization-Id', orgId);
  }

  const method = (opts.method ?? 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (opts.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isStateChanging && (opts.csrf ?? true)) {
    const token = getCookie('csrfToken');
    if (token) headers.set('X-CSRF-Token', token);
  }

  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const err = (isJson ? await res.json().catch(() => undefined) : undefined) as
      | ApiError
      | undefined;
    const message = err?.message ?? `Request failed (${res.status})`;
    const errorCode = err?.errorCode ?? 'UNKNOWN';
    const e = new Error(message);
    (e as any).errorCode = errorCode;
    (e as any).status = res.status;
    (e as any).requestId = err?.requestId;
    throw e;
  }

  if (!isJson) {
    throw new Error('Expected JSON response');
  }

  return (await res.json()) as T;
}
