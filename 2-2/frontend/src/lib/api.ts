export class ApiError extends Error {
  constructor(public status: number, public code?: string, message?: string) {
    super(message ?? 'API Error');
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && typeof window !== 'undefined') {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }
    if (response.status === 403 && typeof window !== 'undefined') {
      window.location.href = '/403';
    }
    if (response.status === 404 && typeof window !== 'undefined') {
      window.location.href = '/404';
    }
    if (response.status >= 500 && typeof window !== 'undefined') {
      window.location.href = '/500';
    }
    throw new ApiError(response.status, body.code, body.message);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json() as Promise<T>;
}
