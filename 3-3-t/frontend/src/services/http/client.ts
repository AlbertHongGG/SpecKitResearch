export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public traceId: string,
    message: string,
  ) {
    super(message);
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export async function apiFetch<T>(path: string, init: RequestInit = {}, orgId?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (orgId) headers.set('X-Organization-Id', orgId);

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpError(res.status, data.code || 'HTTP_ERROR', data.traceId || 'n/a', data.message || 'Request failed');
  }

  return data as T;
}
