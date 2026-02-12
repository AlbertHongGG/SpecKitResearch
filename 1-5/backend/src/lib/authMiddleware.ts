import type { FastifyRequest } from 'fastify';
import { ACCESS_COOKIE } from './cookies.js';
import { unauthorized } from './httpError.js';
import { verifyAccessToken } from './jwt.js';

export type CurrentUser = {
  id: string;
  role: 'User' | 'Reviewer' | 'Admin';
  email: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export async function requireAuth(request: FastifyRequest): Promise<CurrentUser> {
  const token = (request.cookies as Record<string, unknown>)[ACCESS_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    throw unauthorized();
  }

  try {
    const claims = await verifyAccessToken(token);
    const user: CurrentUser = { id: claims.sub, role: claims.role, email: claims.email };
    request.currentUser = user;
    return user;
  } catch {
    throw unauthorized();
  }
}
