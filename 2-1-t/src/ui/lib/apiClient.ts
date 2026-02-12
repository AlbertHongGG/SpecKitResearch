import type { ErrorResponse } from '../../server/errors/errorResponse';

export class ApiError extends Error {
  public readonly status: number;
  public readonly body?: ErrorResponse;

  constructor(params: { status: number; message: string; body?: ErrorResponse }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.body = params.body;
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const body = isJson ? ((await res.json().catch(() => null)) as ErrorResponse | null) : null;
    const message = body?.error?.message ?? `Request failed (${res.status})`;

    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
      if (!isAuthPage && res.status === 401) {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`);
        window.location.assign(`/login?next=${next}`);
      }
      if (res.status === 403) {
        window.location.assign('/forbidden');
      }
    }

    throw new ApiError({ status: res.status, message, body: body ?? undefined });
  }

  if (!isJson) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}
