import { fetchJson } from '@/lib/http/fetchJson';

export type UserPublic = {
  userId: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  isActive: boolean;
};

export const authClient = {
  register: (body: { email: string; password: string }) =>
    fetchJson<{ sessionEstablished: true; user: UserPublic }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    fetchJson<{ sessionEstablished: true; user: UserPublic }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => fetchJson<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => fetchJson<{ user: UserPublic | null }>('/api/auth/me', { method: 'GET' }),
};
