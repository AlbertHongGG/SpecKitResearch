import { ErrorResponseSchema } from './schemas';
import { getAuthSnapshot } from '../state/auth.store';

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number;

  constructor(input: { code: string; message: string; requestId: string; status: number }) {
    super(input.message);
    this.code = input.code;
    this.requestId = input.requestId;
    this.status = input.status;
  }
}

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const json = await res.json();
    const parsed = ErrorResponseSchema.safeParse(json);
    if (parsed.success) {
      return new ApiError({
        code: parsed.data.error.code,
        message: parsed.data.error.message,
        requestId: parsed.data.error.requestId,
        status: res.status,
      });
    }
  } catch {
    // ignore
  }

  return new ApiError({
    code: 'UNKNOWN',
    message: 'Request failed.',
    requestId: 'unknown',
    status: res.status,
  });
}

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${getBaseUrl()}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const token = getAuthSnapshot().token;

  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) throw await parseError(res);
  return res;
}

export async function apiGetJson<T>(path: string, schema: { parse: (v: unknown) => T }) {
  const res = await apiFetch(path);
  const json = await res.json();
  return schema.parse(json);
}

export async function apiPostJson<T>(
  path: string,
  body: unknown,
  schema: { parse: (v: unknown) => T },
) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const json = await res.json();
  return schema.parse(json);
}

export async function apiPostNoContent(path: string, body?: unknown) {
  await apiFetch(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiPatchJson<T>(
  path: string,
  body: unknown,
  schema: { parse: (v: unknown) => T },
) {
  const res = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  const json = await res.json();
  return schema.parse(json);
}
