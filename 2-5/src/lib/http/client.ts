export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  requestId?: string;

  constructor(params: { message: string; code: string; status: number; requestId?: string }) {
    super(params.message);
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const maybe = data as Partial<ApiErrorShape> | null;
    const code = maybe?.error?.code ?? "unknown";
    const message = maybe?.error?.message ?? `HTTP ${res.status}`;
    const requestId = maybe?.error?.requestId ?? res.headers.get("x-request-id") ?? undefined;
    throw new ApiClientError({ message, code, status: res.status, requestId });
  }

  return data as T;
}
