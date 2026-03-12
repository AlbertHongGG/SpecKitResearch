import type { FastifyRequest } from 'fastify';
import { ACCESS_COOKIE } from '../../domain/auth/cookies.js';
import { verifyAccessToken } from '../../domain/auth/accessToken.js';
import { UnauthorizedError } from '../httpErrors.js';

declare module 'fastify' {
    interface FastifyRequest {
        user?: { id: string };
    }
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
    const token = request.cookies?.[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedError();

    try {
        const payload = await verifyAccessToken(token);
        request.user = { id: payload.userId };
    } catch {
        throw new UnauthorizedError();
    }
}
