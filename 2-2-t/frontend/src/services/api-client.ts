import type { ErrorResponse, FieldErrorResponse } from '@app/contracts';

export type ApiErrorPayload = (ErrorResponse | FieldErrorResponse) & {
  error: {
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(params: {
    status: number;
    message: string;
    code?: string;
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, unknown>;
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

export function isApiError(err: unknown): err is ApiError {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: unknown; status?: unknown };
  return e.name === 'ApiError' && typeof e.status === 'number';
}

export function isNotFoundError(err: unknown) {
  return isApiError(err) && err.status === 404;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
}

async function safeParseJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts?: { cookie?: string; onNotFound?: 'redirect-404' | 'return-null' },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${getBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init.headers);
  if (opts?.cookie) headers.set('cookie', opts.cookie);

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // If server returned non-JSON, surface as string
      return text as unknown as T;
    }
  }

  if (res.status === 404 && opts?.onNotFound) {
    if (opts.onNotFound === 'return-null') {
      return null as unknown as T;
    }

    // Client-side fallback: redirect to /404 for marketing visibility cases.
    if (typeof window !== 'undefined') {
      window.location.href = '/404';
      // keep promise pending to avoid further UI work
      return new Promise<T>(() => undefined);
    }
  }

  const requestId = res.headers.get('x-request-id') || undefined;
  const body = (await safeParseJson(res)) as ApiErrorPayload | undefined;
  const message = body?.error?.message || `HTTP ${res.status}`;

  throw new ApiError({
    status: res.status,
    message,
    code: body?.error?.code,
    fieldErrors: body?.error?.fieldErrors,
    details: body?.error?.details,
    requestId,
  });
}
