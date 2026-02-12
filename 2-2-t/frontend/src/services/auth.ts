import { apiFetch, isApiError } from './api-client';
import type { AuthSessionResponse, LoginRequest, RegisterRequest } from '@app/contracts';

export async function register(body: RegisterRequest) {
  await apiFetch<void>('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function login(body: LoginRequest) {
  return apiFetch<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function logout() {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}

export async function getSession(params?: { cookie?: string }) {
  return apiFetch<AuthSessionResponse>('/auth/session', {}, { cookie: params?.cookie });
}

export async function getSessionOrNull(params?: { cookie?: string }) {
  try {
    return await getSession(params);
  } catch (err) {
    if (isApiError(err) && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}
