import { getToken } from '../auth/authStore';
import { ApiError, type ErrorResponse } from './errors';

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
}

async function parseError(res: Response): Promise<ApiError> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await res.json()) as Partial<ErrorResponse>;
    return new ApiError({
      status: res.status,
      code: body.code ?? 'UNKNOWN_ERROR',
      message: body.message ?? 'Request failed',
      details: body.details,
    });
  }

  return new ApiError({
    status: res.status,
    code: 'UNKNOWN_ERROR',
    message: await res.text(),
  });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const url = new URL(path, getBaseUrl());
  const headers = new Headers(init?.headers);

  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  let body: BodyInit | undefined = init?.body ?? undefined;
  if (init && 'json' in init) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers,
    body,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}
