import { ErrorEnvelopeSchema } from '@internal/contracts';

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()\[\]\\\/\+^]/g, '\\$&')}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  details?: unknown;

  constructor(params: { status: number; code: string; message: string; requestId?: string; details?: unknown }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    if (params.requestId !== undefined) this.requestId = params.requestId;
    if (params.details !== undefined) this.details = params.details;
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const csrf = getCookie('csrf_token');
  const headers: Record<string, string> = {
    ...(init?.headers as any),
  };
  if (init?.method && init.method !== 'GET' && init.method !== 'HEAD') {
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    const envelope = ErrorEnvelopeSchema.safeParse(json);
    if (envelope.success) {
      throw new ApiError({
        status: res.status,
        code: envelope.data.error.code,
        message: envelope.data.error.message,
        requestId: envelope.data.error.requestId,
        details: envelope.data.error.details,
      });
    }
  } catch {
    // ignore
  }
  throw new ApiError({ status: res.status, code: 'Unknown', message: text || res.statusText });
}
