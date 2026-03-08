import { ApiError, isApiErrorEnvelope } from './errors';

export type OkEnvelope<T> = { ok: true; data: T; requestId: string };

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<OkEnvelope<T>> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (isApiErrorEnvelope(json)) {
      throw new ApiError(json.error.message, {
        requestId: json.requestId,
        code: json.error.code,
        fieldErrors: json.error.fieldErrors,
        status: res.status,
      });
    }
    throw new ApiError('Request failed', { status: res.status });
  }

  return json as OkEnvelope<T>;
}
