export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  public code: string;
  public requestId?: string;
  public details?: unknown;
  public status: number;

  constructor(input: { status: number; code: string; message: string; requestId?: string; details?: unknown }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

export function getApiBaseUrl(): string {
  return (import.meta as any).env?.VITE_API_BASE_URL ?? '';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const data = (await res.json().catch(() => null)) as ErrorResponse | null;
      if (data?.error?.code && data?.error?.message) {
        throw new ApiError({
          status: res.status,
          code: data.error.code,
          message: data.error.message,
          requestId: data.error.request_id,
          details: data.error.details,
        });
      }
    }

    const text = await res.text().catch(() => '');
    throw new ApiError({
      status: res.status,
      code: 'HTTP_ERROR',
      message: text || `HTTP ${res.status}`,
    });
  }

  if (!isJson) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (await res.text()) as any;
  }

  return (await res.json()) as T;
}
