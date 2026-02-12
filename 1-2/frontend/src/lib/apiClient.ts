import { getCsrfToken, loadCsrfTokenFromStorage, setCsrfToken } from './csrf';
import { HttpError } from './httpError';

loadCsrfTokenFromStorage();

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type Json = Record<string, unknown> | unknown[] | null;

async function parseJsonSafe(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export async function ensureCsrf() {
    const token = getCsrfToken();
    if (token) return token;

    const res = await fetch(`${API_BASE}/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
        throw new HttpError({ status: res.status, message: data?.message ?? 'Failed to get CSRF token', code: data?.code, details: data });
    }

    if (typeof data?.token === 'string') {
        setCsrfToken(data.token);
        return data.token;
    }

    throw new HttpError({ status: 500, message: 'Invalid CSRF response' });
}

export async function apiFetch<T = any>(
    path: string,
    opts?: { method?: string; json?: Json; formData?: FormData; headers?: Record<string, string> },
): Promise<T> {
    const method = (opts?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = { ...(opts?.headers ?? {}) };

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        const csrf = await ensureCsrf();
        headers['X-CSRF-Token'] = csrf;
    }

    let body: BodyInit | undefined;
    if (opts?.formData) {
        body = opts.formData;
    } else if (opts?.json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.json);
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: 'include',
        headers,
        body,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await parseJsonSafe(res) : await res.blob();

    if (!res.ok) {
        throw new HttpError({
            status: res.status,
            message: (data as any)?.message ?? res.statusText,
            code: (data as any)?.code,
            details: (data as any)?.details,
            fieldErrors: (data as any)?.fieldErrors,
        });
    }

    return data as T;
}
