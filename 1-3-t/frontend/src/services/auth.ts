import { httpJson } from './http';
import type { SessionResponse } from './session';

export type AuthSuccessResponse = {
  user: SessionResponse extends { authenticated: true; user: infer U } ? U : never;
};

export async function register(args: {
  email: string;
  password: string;
  passwordConfirm: string;
}): Promise<AuthSuccessResponse> {
  return await httpJson<AuthSuccessResponse>({
    method: 'POST',
    path: '/auth/register',
    body: args,
  });
}

export async function login(args: {
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  return await httpJson<AuthSuccessResponse>({
    method: 'POST',
    path: '/auth/login',
    body: args,
  });
}

export async function logout(): Promise<{ ok: true }> {
  return await httpJson({
    method: 'POST',
    path: '/auth/logout',
  });
}
