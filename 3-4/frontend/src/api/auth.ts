import { apiFetch } from './http';
import { withCsrfHeaders } from './csrf';

export type Role = 'USER' | 'ADMIN';

export type SessionResponse = {
  user: { id: string; email: string; role: Role };
  expires_at: string | null;
};

export async function login(email: string, password: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    headers: withCsrfHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({}),
  });
}

export async function getSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/api/auth/session');
}
