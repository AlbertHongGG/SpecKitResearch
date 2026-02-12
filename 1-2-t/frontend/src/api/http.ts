export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiErrorResponse {
  code:
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'validation_error'
    | 'bad_request'
    | 'internal_error';
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: ApiErrorResponse;

  constructor(message: string, status: number, data?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base) return '';
  return base.replace(/\/$/, '');
}

async function parseJsonIfPossible(res: Response): Promise<unknown | undefined> {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined;
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  init: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    skipAuthRedirect?: boolean;
  } = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: init.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const maybeJson = (await parseJsonIfPossible(res)) as ApiErrorResponse | undefined;
    const msg = maybeJson?.message ?? `Request failed (${res.status})`;
    if (res.status === 401 && !init.skipAuthRedirect) {
      const mod = await import('../features/auth/sessionExpired');
      mod.redirectToLoginPreservingReturnTo();
    }
    throw new ApiError(msg, res.status, maybeJson);
  }

  const data = (await parseJsonIfPossible(res)) as T | undefined;
  return (data ?? (undefined as unknown as T));
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const maybeJson = (await parseJsonIfPossible(res)) as ApiErrorResponse | undefined;
    const msg = maybeJson?.message ?? `Upload failed (${res.status})`;
    if (res.status === 401) {
      const mod = await import('../features/auth/sessionExpired');
      mod.redirectToLoginPreservingReturnTo();
    }
    throw new ApiError(msg, res.status, maybeJson);
  }

  const data = (await parseJsonIfPossible(res)) as T | undefined;
  return (data ?? (undefined as unknown as T));
}
