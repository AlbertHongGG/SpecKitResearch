export type ApiError = {
  status: number;
  code?: string;
  message?: string;
  requestId?: string;
};

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: any = undefined;
    try {
      body = await res.json();
    } catch {
      // ignore
    }

    const error: ApiError = {
      status: res.status,
      code: body?.error?.code,
      message: body?.error?.message,
      requestId: body?.error?.requestId,
    };
    throw error;
  }

  return (await res.json()) as T;
}
