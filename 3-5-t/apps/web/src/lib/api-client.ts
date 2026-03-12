import { loadWebConfig } from '../config';

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(input: { statusCode: number; code: string; message: string; requestId?: string; details?: unknown }) {
    super(input.message);
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

function getApiBaseUrl(): string {
  // In the browser, NEXT_PUBLIC_* is available at build/runtime.
  const cfg = loadWebConfig();
  return cfg.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<{ status: number; data: T } | { status: number; data: null }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');

  let body: BodyInit | undefined = init.body as any;
  if (init.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const maybeJson = isJson ? ((await res.json().catch(() => null)) as ApiErrorBody | null) : null;
    if (maybeJson?.error?.code && maybeJson?.error?.message) {
      throw new ApiError({
        statusCode: res.status,
        code: maybeJson.error.code,
        message: maybeJson.error.message,
        requestId: maybeJson.error.requestId,
        details: maybeJson.error.details,
      });
    }

    throw new ApiError({
      statusCode: res.status,
      code: 'HTTP_ERROR',
      message: res.statusText || `HTTP ${res.status}`,
    });
  }

  if (res.status === 204) return { status: res.status, data: null };
  if (!isJson) return { status: res.status, data: null };

  return { status: res.status, data: (await res.json()) as T };
}
