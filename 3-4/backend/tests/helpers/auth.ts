import type { FastifyInstance } from 'fastify';
import { getSetCookieValues, pickCookie, serializeCookies } from './cookies';

export async function bootstrapCsrf(app: FastifyInstance): Promise<{ cookieName: string; token: string }> {
  const res = await app.inject({ method: 'GET', url: '/health' });
  const setCookie = getSetCookieValues(res.headers as any);
  const csrf = pickCookie(setCookie, process.env.CSRF_COOKIE_NAME ?? 'csrf_token');
  if (!csrf) throw new Error('csrf cookie not set');
  return { cookieName: csrf.name, token: csrf.value };
}

export async function loginAs(app: FastifyInstance, input: { email: string; password: string; csrfToken: string }): Promise<{ sessionCookie: { name: string; value: string } }>{
  const csrfName = process.env.CSRF_COOKIE_NAME ?? 'csrf_token';
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: {
      cookie: serializeCookies([{ name: csrfName, value: input.csrfToken }]),
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
    },
    payload: JSON.stringify({ email: input.email, password: input.password }),
  });

  if (res.statusCode !== 200) {
    throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  }

  const setCookie = getSetCookieValues(res.headers as any);
  const session = pickCookie(setCookie, process.env.SESSION_COOKIE_NAME ?? 'paysim_session');
  if (!session) throw new Error('session cookie not set');

  return { sessionCookie: session };
}

export function authHeaders(input: { csrfToken: string; sessionCookie: { name: string; value: string } }) {
  const csrfName = process.env.CSRF_COOKIE_NAME ?? 'csrf_token';
  return {
    cookie: serializeCookies([
      { name: csrfName, value: input.csrfToken },
      { name: input.sessionCookie.name, value: input.sessionCookie.value },
    ]),
    origin: 'http://localhost:5173',
    'x-csrf-token': input.csrfToken,
  };
}
