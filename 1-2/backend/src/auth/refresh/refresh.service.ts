import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { REFRESH_TTL_MS } from '../auth.constants';

@Injectable()
export class RefreshService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async rotate(refreshToken: string): Promise<{ userId: string; refreshToken: string }> {
        const tokenHash = sha256(refreshToken);

        const session = await this.prisma.authRefreshSession.findUnique({
            where: { tokenHash },
        });

        if (!session || session.revokedAt || session.expiresAt <= new Date()) {
            throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
        }

        if (session.replacedBySessionId) {
            // replay detected
            await this.prisma.authRefreshSession.updateMany({
                where: { userId: session.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw new ForbiddenException({ code: 'REFRESH_REPLAY', message: 'Refresh token replay detected' });
        }

        const newRefreshToken = randomBytes(48).toString('base64url');
        const newRefreshHash = sha256(newRefreshToken);

        const now = new Date();
        const newSession = await this.prisma.authRefreshSession.create({
            data: {
                userId: session.userId,
                tokenHash: newRefreshHash,
                createdAt: now,
                expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
            },
        });

        await this.prisma.authRefreshSession.update({
            where: { id: session.id },
            data: {
                revokedAt: now,
                replacedBySessionId: newSession.id,
            },
        });

        return { userId: session.userId, refreshToken: newRefreshToken };
    }
}

function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}
