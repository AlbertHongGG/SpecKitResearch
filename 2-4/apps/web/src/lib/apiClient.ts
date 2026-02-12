export type ApiError = {
  code: string;
  message: string;
  request_id?: string;
  errors?: Array<{ path: string; message: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseValidationErrors(value: unknown): ApiError['errors'] {
  if (!Array.isArray(value)) return undefined;

  const out: Array<{ path: string; message: string }> = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const path = item.path;
    const message = item.message;
    if (typeof path === 'string' && typeof message === 'string') {
      out.push({ path, message });
    }
  }

  return out.length > 0 ? out : undefined;
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
  };

  if (init.body && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const requestId = res.headers.get('x-request-id') ?? undefined;
  const json = await readJsonSafe(res);
  const obj = isRecord(json) ? json : {};

  if (!res.ok) {
    const err: ApiError = {
      code: typeof obj.code === 'string' ? obj.code : 'HTTP_ERROR',
      message: typeof obj.message === 'string' ? obj.message : `Request failed (${res.status})`,
      request_id: typeof obj.request_id === 'string' ? obj.request_id : requestId,
      errors: parseValidationErrors(obj.errors),
    };
    throw Object.assign(new Error(err.message), { status: res.status, body: err });
  }

  return json as T;
}
