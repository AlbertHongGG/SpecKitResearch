import { isErrorResponse, type ApiError, type NetworkError } from './apiErrors';

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const matches = document.cookie.match(
    new RegExp(
      '(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)',
    ),
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequestOptions = {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
};

function buildUrl(baseUrl: string, path: string, query?: HttpRequestOptions['query']) {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function httpJson<T>(opts: HttpRequestOptions): Promise<T> {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '';
  const method = opts.method ?? 'GET';

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  const isUnsafeMethod = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  if (isUnsafeMethod) {
    const csrf = getCookie('csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const url = buildUrl(baseUrl, `${apiPrefix}${opts.path}`, opts.query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    const networkError: NetworkError = {
      type: 'network',
      message: err instanceof Error ? err.message : 'network error',
    };
    throw networkError;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const data = isJson ? await res.json().catch(() => undefined) : undefined;
    const error = isErrorResponse(data)
      ? data
      : {
          code: 'UNKNOWN_ERROR',
          message: '請求失敗',
          requestId: res.headers.get('x-request-id') ?? 'unknown',
        };

    const apiError: ApiError = {
      type: 'api',
      status: res.status,
      error,
    };

    if (apiError.status === 401 && opts.path !== '/session') {
      window.dispatchEvent(new CustomEvent('auth:required'));
    }

    throw apiError;
  }

  if (!isJson) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await res.text()) as any as T;
  }

  return (await res.json()) as T;
}
