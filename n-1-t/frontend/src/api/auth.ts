import { apiRequest, isApiError } from './http';
import type { AuthMe, LoginRequest, RegisterRequest } from './types';

export function register(body: RegisterRequest) {
  return apiRequest<AuthMe>('/auth/register', { method: 'POST', body });
}

export function login(body: LoginRequest) {
  return apiRequest<AuthMe>('/auth/login', { method: 'POST', body });
}

export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<AuthMe | null> {
  try {
    return await apiRequest<AuthMe>('/me');
  } catch (e: unknown) {
    if (isApiError(e) && e.status === 401) return null;
    throw e;
  }
}
