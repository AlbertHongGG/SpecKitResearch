import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { ValidationError, UnauthorizedError } from '../httpErrors.js';
import { hashPassword, verifyPassword } from '../../domain/auth/password.js';
import { signAccessToken } from '../../domain/auth/accessToken.js';
import {
    clearAuthCookies,
    setAccessCookie,
    setRefreshCookie,
    REFRESH_COOKIE,
} from '../../domain/auth/cookies.js';
import {
    createRefreshSession,
    revokeRefreshSession,
    rotateRefreshSession,
} from '../../domain/auth/refreshSessionService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(1).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post('/register', async (request, reply) => {
        const body = app.validate(registerSchema, request.body);

        const email = body.email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ValidationError({ email: ['Email already registered'] });
        }

        const passwordHash = await hashPassword(body.password);
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                displayName: body.displayName ?? email.split('@')[0] ?? 'User',
            },
            select: { id: true, email: true, displayName: true, createdAt: true },
        });

        const { token, expiresAt } = await signAccessToken({ userId: user.id });
        const refresh = await createRefreshSession(user.id);

        setAccessCookie(reply, token, expiresAt);
        setRefreshCookie(reply, refresh.refreshToken, refresh.expiresAt);

        reply.status(201).send({
            user,
            session: { expiresAt: expiresAt.toISOString() },
        });
    });

    app.post('/login', { preHandler: [app.rateLimitLogin] }, async (request, reply) => {
        const body = app.validate(loginSchema, request.body);

        const email = body.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedError('Invalid credentials');

        const ok = await verifyPassword(body.password, user.passwordHash);
        if (!ok) throw new UnauthorizedError('Invalid credentials');

        const { token, expiresAt } = await signAccessToken({ userId: user.id });
        const refresh = await createRefreshSession(user.id);

        setAccessCookie(reply, token, expiresAt);
        setRefreshCookie(reply, refresh.refreshToken, refresh.expiresAt);

        reply.send({
            user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
            session: { expiresAt: expiresAt.toISOString() },
        });
    });

    app.post('/refresh', { preHandler: [app.rateLimitRefresh] }, async (request, reply) => {
        const refreshToken = request.cookies?.[REFRESH_COOKIE];
        if (!refreshToken) throw new UnauthorizedError();

        const rotated = await rotateRefreshSession(refreshToken);
        const { token, expiresAt } = await signAccessToken({ userId: rotated.userId });

        setAccessCookie(reply, token, expiresAt);
        setRefreshCookie(reply, rotated.refreshToken, rotated.expiresAt);

        const user = await prisma.user.findUnique({
            where: { id: rotated.userId },
            select: { id: true, email: true, displayName: true, createdAt: true },
        });
        if (!user) throw new UnauthorizedError();

        reply.send({
            user,
            session: { expiresAt: expiresAt.toISOString() },
        });
    });

    app.post('/logout', async (request, reply) => {
        const refreshToken = request.cookies?.[REFRESH_COOKIE];
        if (refreshToken) {
            await revokeRefreshSession(refreshToken);
        }
        clearAuthCookies(reply);
        reply.send({ success: true });
    });

    app.get('/me', { preHandler: [requireAuth] }, async (request) => {
        const userId = request.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, displayName: true, createdAt: true },
        });
        if (!user) throw new UnauthorizedError();
        return user;
    });
};

export default authRoutes;
