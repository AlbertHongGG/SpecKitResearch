export type ErrorResponse = {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: ErrorResponse;

  constructor(status: number, payload?: ErrorResponse) {
    super(payload?.message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isConflictError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 409;
}

export function isUnauthorizedError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 401;
}

export function isForbiddenError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 403;
}

export function isNotFoundError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 404;
}

export type ApiErrorKind = 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'other';

export function classifyApiError(
  err: unknown,
  options?: { preferNotFoundForForbidden?: boolean },
): ApiErrorKind {
  if (!isApiError(err)) return 'other';
  if (err.status === 401) return 'unauthorized';
  if (err.status === 409) return 'conflict';
  if (err.status === 404) return 'notFound';
  if (err.status === 403) return options?.preferNotFoundForForbidden ? 'notFound' : 'forbidden';
  return 'other';
}

export function userFacingErrorMessage(err: unknown): string {
  if (isConflictError(err)) return '已被處理';
  if (isApiError(err)) return err.payload?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return '未知錯誤';
}

function getCookie(name: string): string | undefined {
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return undefined;
}

function isWriteMethod(method?: string): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers);
  headers.set('x-request-id', crypto.randomUUID());

  if (!headers.has('content-type') && options.body && typeof options.body === 'string') {
    headers.set('content-type', 'application/json');
  }

  if (isWriteMethod(options.method)) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
  }

  const resp = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = resp.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!resp.ok) {
    const payload = isJson ? ((await resp.json().catch(() => undefined)) as ErrorResponse | undefined) : undefined;
    throw new ApiError(resp.status, payload);
  }

  if (resp.status === 204) return undefined as T;
  return (isJson ? await resp.json() : await resp.text()) as T;
}
