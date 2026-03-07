import { API_BASE_URL } from '@/lib/constants';

export type ApiErrorPayload = {
  error_code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? `API request failed with status ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = payload?.error_code;
    this.details = payload?.details;
    this.requestId = payload?.request_id;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const hasJson = contentType.includes('application/json');
  const payload = hasJson ? ((await response.json()) as unknown) : undefined;

  if (!response.ok) {
    throw new ApiClientError(response.status, payload as ApiErrorPayload);
  }

  return payload as T;
}
