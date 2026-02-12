import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../http/errors';
import { hashPassword, verifyPassword } from '../domain/auth/password';
import { createAccessPayload, encodeAccessPayload, getSignedCookie } from '../http/auth/access';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../http/auth/cookies';
import { hashRefreshToken, rotateRefreshToken } from '../domain/auth/refresh-tokens';
import { createUser, findUserByEmail, findUserById } from '../repos/user-repo';
import {
  createAuthSession,
  findAuthSessionByHash,
  isSessionActive,
  revokeAllUserSessions,
  revokeAuthSession,
} from '../repos/auth-session-repo';
import { requireAuth } from '../http/auth/require-auth';
import { withTransaction } from '../db/tx';

const ACCESS_MAX_AGE_SEC = 15 * 60;
const REFRESH_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const zRegister = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

const zLogin = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (req, reply) => {
    const input = zRegister.parse(req.body);

    const existing = await findUserByEmail(app.prisma, input.email);
    if (existing) {
      throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'Email already registered');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await createUser(app.prisma, {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });

    const { refreshToken, refreshTokenHash } = rotateRefreshToken(app.config.COOKIE_SECRET);
    const session = await createAuthSession(app.prisma, {
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_SEC * 1000),
      rotatedFromSessionId: null,
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip,
    });

    const accessPayload = createAccessPayload({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    setAuthCookies(reply, app.config, {
      accessToken: encodeAccessPayload(accessPayload),
      refreshToken,
      accessMaxAgeSec: ACCESS_MAX_AGE_SEC,
      refreshMaxAgeSec: REFRESH_MAX_AGE_SEC,
    });

    reply.send({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      sessionId: session.id,
    });
  });

  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const input = zLogin.parse(req.body);
    const user = await findUserByEmail(app.prisma, input.email);
    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const { refreshToken, refreshTokenHash } = rotateRefreshToken(app.config.COOKIE_SECRET);
    const session = await createAuthSession(app.prisma, {
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_SEC * 1000),
      rotatedFromSessionId: null,
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip,
    });

    const accessPayload = createAccessPayload({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    setAuthCookies(reply, app.config, {
      accessToken: encodeAccessPayload(accessPayload),
      refreshToken,
      accessMaxAgeSec: ACCESS_MAX_AGE_SEC,
      refreshMaxAgeSec: REFRESH_MAX_AGE_SEC,
    });

    reply.send({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      sessionId: session.id,
    });
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (req) => {
    const user = await findUserById(app.prisma, req.user!.id);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    // Revoke all sessions for current user (simple + safe; covers refresh cookie too)
    await revokeAllUserSessions(app.prisma, req.user!.id);
    clearAuthCookies(reply, app.config);
    reply.status(204).send();
  });

  app.post('/auth/refresh', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const refreshToken = getSignedCookie(req, REFRESH_COOKIE);
    if (!refreshToken) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');

    // Find session by hash
    const refreshTokenHash = hashRefreshToken(refreshToken, app.config.COOKIE_SECRET);

    const session = await findAuthSessionByHash(app.prisma, refreshTokenHash);
    if (!session) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');

    if (!session.revokedAt) {
      const active = await isSessionActive(session);
      if (!active) {
        await revokeAuthSession(app.prisma, session.id);
        throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const user = await findUserById(app.prisma, session.userId);
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');

      const rotated = rotateRefreshToken(app.config.COOKIE_SECRET);

      const newSession = await withTransaction(app.prisma, async (tx) => {
        await revokeAuthSession(tx, session.id);
        return createAuthSession(tx, {
          userId: user.id,
          refreshTokenHash: rotated.refreshTokenHash,
          expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_SEC * 1000),
          rotatedFromSessionId: session.id,
          userAgent: req.headers['user-agent'] ?? null,
          ip: req.ip,
        });
      });

      const accessPayload = createAccessPayload({
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
      });

      setAuthCookies(reply, app.config, {
        accessToken: encodeAccessPayload(accessPayload),
        refreshToken: rotated.refreshToken,
        accessMaxAgeSec: ACCESS_MAX_AGE_SEC,
        refreshMaxAgeSec: REFRESH_MAX_AGE_SEC,
      });

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        sessionId: newSession.id,
      });
      return;
    }

    // Reuse detected: revoke all sessions for user
    await revokeAllUserSessions(app.prisma, session.userId);
    clearAuthCookies(reply, app.config);
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
  });
};
