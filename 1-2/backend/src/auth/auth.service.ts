import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { PasswordService } from './password/password.service';
import { randomBytes, createHash } from 'crypto';
import { getEnv } from '../common/config/env';
import { ACCESS_TTL_MS, REFRESH_TTL_MS } from './auth.constants';
import { RefreshService } from './refresh/refresh.service';

function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly passwords: PasswordService,
        private readonly refreshService: RefreshService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { department: true },
        });
        if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

        const ok = await this.passwords.verify(password, user.passwordHash);
        if (!ok) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

        const accessToken = await this.signAccessToken(user.id, user.role);
        const refreshToken = this.generateRefreshToken();

        const now = new Date();
        await this.prisma.authRefreshSession.create({
            data: {
                userId: user.id,
                tokenHash: sha256(refreshToken),
                createdAt: now,
                expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
            },
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                department: { id: user.department.id, name: user.department.name },
            },
            tokens: {
                accessToken,
                refreshToken,
                accessMaxAgeMs: ACCESS_TTL_MS,
                refreshMaxAgeMs: REFRESH_TTL_MS,
            },
        };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { department: true },
        });
        if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Not logged in' });

        return {
            id: user.id,
            name: user.name,
            role: user.role,
            department: { id: user.department.id, name: user.department.name },
        };
    }

    async refresh(refreshToken: string) {
        const rotated = await this.refreshService.rotate(refreshToken);

        const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
        if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid session' });

        const accessToken = await this.signAccessToken(user.id, user.role);

        return {
            accessToken,
            refreshToken: rotated.refreshToken,
            accessMaxAgeMs: ACCESS_TTL_MS,
            refreshMaxAgeMs: REFRESH_TTL_MS,
        };
    }

    async logout(refreshToken: string | undefined) {
        if (!refreshToken) return;

        const tokenHash = sha256(refreshToken);
        await this.prisma.authRefreshSession.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    async verifyAccessToken(token: string) {
        const env = getEnv();
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: env.JWT_ACCESS_SECRET,
            });
            return payload as { sub: string; role: string };
        } catch {
            throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
    }

    private async signAccessToken(userId: string, role: string) {
        const env = getEnv();
        return this.jwt.signAsync(
            { sub: userId, role },
            { secret: env.JWT_ACCESS_SECRET, expiresIn: Math.floor(ACCESS_TTL_MS / 1000) },
        );
    }

    private generateRefreshToken(): string {
        return randomBytes(48).toString('base64url');
    }
}
