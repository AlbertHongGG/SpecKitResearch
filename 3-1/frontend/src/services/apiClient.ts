export type ApiError = {
  status: number;
  requestId?: string;
  code?: string;
  message: string;
  details?: unknown;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const err: ApiError = {
      status: res.status,
      requestId: body?.requestId,
      code: body?.error?.code,
      message: body?.error?.message ?? `HTTP ${res.status}`,
      details: body?.error?.details,
    };
    throw err;
  }

  return (await res.json()) as T;
}
