import crypto from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../api/httpErrors.js';

function sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('base64');
}

function randomToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

function refreshExpiresAt(): Date {
    return new Date(Date.now() + env.AUTH_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createRefreshSession(userId: string): Promise<{ refreshToken: string; expiresAt: Date }> {
    const refreshToken = randomToken();
    const expiresAt = refreshExpiresAt();

    await prisma.refreshSession.create({
        data: {
            userId,
            refreshTokenHash: sha256(refreshToken),
            expiresAt,
        },
    });

    return { refreshToken, expiresAt };
}

export async function rotateRefreshSession(refreshToken: string): Promise<{ userId: string; refreshToken: string; expiresAt: Date }> {
    const tokenHash = sha256(refreshToken);

    const existing = await prisma.refreshSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!existing || existing.status !== 'active') {
        throw new UnauthorizedError('Invalid refresh session');
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
        await prisma.refreshSession.update({
            where: { id: existing.id },
            data: { status: 'revoked', lastUsedAt: new Date() },
        });
        throw new UnauthorizedError('Refresh session expired');
    }

    const newRefreshToken = randomToken();
    const expiresAt = refreshExpiresAt();

    await prisma.$transaction(async (tx) => {
        await tx.refreshSession.update({
            where: { id: existing.id },
            data: {
                status: 'revoked',
                lastUsedAt: new Date(),
            },
        });

        await tx.refreshSession.create({
            data: {
                userId: existing.userId,
                refreshTokenHash: sha256(newRefreshToken),
                expiresAt,
                rotatedFromSessionId: existing.id,
            },
        });
    });

    return { userId: existing.userId, refreshToken: newRefreshToken, expiresAt };
}

export async function revokeRefreshSession(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    const existing = await prisma.refreshSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!existing) return;

    await prisma.refreshSession.update({
        where: { id: existing.id },
        data: { status: 'revoked', lastUsedAt: new Date() },
    });
}
