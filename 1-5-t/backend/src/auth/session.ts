import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { ApiError } from '../observability/errors.js';

export type SessionUser = { id: string; email: string; role: 'User' | 'Reviewer' | 'Admin' };

const SESSION_COOKIE = 'session';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function setSessionCookie(reply: FastifyReply, user: SessionUser) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: '7d',
  });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // Keep dev working over http://localhost while hardening production.
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function getSessionUserFromRequest(request: FastifyRequest): SessionUser | null {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return {
      id: String(decoded.sub),
      email: String(decoded.email),
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export function requireAuthenticatedUser(request: FastifyRequest): SessionUser {
  const user = (request as any).user as SessionUser | undefined;
  if (!user) {
    throw new ApiError({ statusCode: 401, code: 'Unauthorized', message: 'Unauthorized' });
  }
  return user;
}
