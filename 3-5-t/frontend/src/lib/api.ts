export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

function toCamelCaseKey(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function camelizeDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => camelizeDeep(v)) as any;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[toCamelCaseKey(k)] = camelizeDeep(v as any);
    }
    return out as any;
  }
  return value;
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, getBaseUrl());
  const headers = new Headers(init?.headers ?? {});
  // Avoid sending `content-type: application/json` for body-less POSTs.
  // Fastify rejects empty JSON bodies when content-type is set.
  if (!headers.has('content-type') && init?.body != null) {
    headers.set('content-type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let data: any = null;
    try {
      data = camelizeDeep(await res.json());
    } catch {
      // ignore
    }
    const err = (data as ApiError) ?? ({ error: { code: 'HTTP_ERROR', message: res.statusText } } as ApiError);
    throw Object.assign(new Error(err.error.message), { status: res.status, code: err.error.code, data: err });
  }

  const data = camelizeDeep(await res.json());
  return data as T;
}
