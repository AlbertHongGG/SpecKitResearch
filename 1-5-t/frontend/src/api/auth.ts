import { LoginRequest, LoginResponse, MeResponse } from '@internal/contracts';
import { apiFetch } from './http';

export const authApi = {
  login(body: LoginRequest) {
    return apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  logout() {
    return apiFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return apiFetch<MeResponse>('/api/auth/me');
  },
};
