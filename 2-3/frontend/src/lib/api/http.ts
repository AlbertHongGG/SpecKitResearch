import { env } from '../env';

export type ApiErrorPayload = {
    error: {
        code: string;
        message: string;
        requestId?: string;
        fieldErrors?: Record<string, string[]>;
    };
    latest?: unknown;
};

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly requestId?: string;
    readonly fieldErrors?: Record<string, string[]>;
    readonly latest?: unknown;

    constructor(status: number, payload: ApiErrorPayload) {
        super(payload.error.message);
        this.status = status;
        this.code = payload.error.code;
        this.requestId = payload.error.requestId;
        this.fieldErrors = payload.error.fieldErrors;
        this.latest = payload.latest;
    }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, env.NEXT_PUBLIC_API_BASE_URL);

    const method = (init.method ?? 'GET').toUpperCase();
    const needsCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: {
            'content-type': 'application/json',
            ...(needsCsrf ? { 'x-csrf': '1' } : {}),
            ...(init.headers ?? {}),
        },
    });

    const text = await res.text();
    const json = text.length ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
        if (json && typeof json === 'object' && 'error' in json) {
            throw new ApiError(res.status, json as ApiErrorPayload);
        }
        throw new Error(`Request failed: ${res.status}`);
    }

    return json as T;
}
