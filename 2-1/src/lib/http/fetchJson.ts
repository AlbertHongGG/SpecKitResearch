export class FetchJsonError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'FetchJsonError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const hasJson = contentType.includes('application/json');
  const payload = hasJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.message ?? res.statusText;
    const code = payload?.code;
    throw new FetchJsonError(message, res.status, code, payload?.details);
  }

  return payload as T;
}
