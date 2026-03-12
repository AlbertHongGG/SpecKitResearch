import { getFrontendEnv } from '@/lib/env';

export type ApiError = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

function dispatchToast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, variant } }));
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/register')) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

function redirectTo403() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/403')) return;
  window.location.href = '/403';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getFrontendEnv();
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;

  const headers = new Headers(init?.headers ?? {});
  const hasBody = Object.prototype.hasOwnProperty.call(init ?? {}, 'body') && init?.body !== undefined;
  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers
  });

  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401) {
      redirectToLogin();
    } else if (res.status === 403) {
      redirectTo403();
    } else if (res.status === 429) {
      dispatchToast('請求過於頻繁（429），請稍後再試。', 'error');
    }
    throw new HttpError(res.status, body);
  }

  return body as T;
}
