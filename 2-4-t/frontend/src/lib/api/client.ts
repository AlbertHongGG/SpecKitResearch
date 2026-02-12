export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    request_id?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function newRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export async function apiFetchJson<T>(
  path: string,
  init: RequestInit = {},
  opts: { baseUrl?: string; csrfToken?: string } = {}
): Promise<T> {
  const baseUrl = opts.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body != null) {
    headers.set('content-type', 'application/json');
  }
  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', newRequestId());
  }

  const method = (init.method ?? 'GET').toUpperCase();
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') && opts.csrfToken) {
    headers.set('x-csrf-token', opts.csrfToken);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  const text = await res.text();
  const body = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    const maybe = body as Partial<ApiErrorShape> | undefined;
    const message = maybe?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
