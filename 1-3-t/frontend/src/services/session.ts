import type { ApiError } from './apiErrors';
import { httpJson } from './http';

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionResponse =
  | {
      authenticated: true;
      user: SessionUser;
    }
  | {
      authenticated: false;
    };

export async function getSession(): Promise<SessionResponse> {
  try {
    return await httpJson<SessionResponse>({ method: 'GET', path: '/session' });
  } catch (err) {
    const api = err as ApiError;
    if (api?.type === 'api' && api.status === 401) {
      return { authenticated: false };
    }
    throw err;
  }
}
