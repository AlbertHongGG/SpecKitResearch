export type ApiError = {
  status: number;
  message: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;

  const root = payload as Record<string, unknown>;

  const message = root['message'];
  if (typeof message === 'string' && message.trim()) return message;

  const error = root['error'];
  if (error && typeof error === 'object') {
    const errorMessage = (error as Record<string, unknown>)['message'];
    if (typeof errorMessage === 'string' && errorMessage.trim()) return errorMessage;
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const data: unknown = await res.json().catch(() => null);
      const message = getApiErrorMessage(data, res.statusText);
      throw { status: res.status, message } satisfies ApiError;
    }
    throw { status: res.status, message: res.statusText } satisfies ApiError;
  }

  if (!isJson) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

export function isApiError(e: unknown): e is ApiError {
  return !!e && typeof e === 'object' && 'status' in e && 'message' in e;
}
