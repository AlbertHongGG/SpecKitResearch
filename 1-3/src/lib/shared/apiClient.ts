import type { ApiErrorResponse } from '@/lib/shared/apiError';

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let payload: ApiErrorResponse | null = null;
    try {
      payload = (await res.json()) as ApiErrorResponse;
    } catch {
      // ignore
    }

    const code = payload?.error?.code ?? 'HTTP_ERROR';
    const message = payload?.error?.message ?? `HTTP ${res.status}`;
    throw new HttpError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
