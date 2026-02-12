import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { hashPassword, verifyPassword } from './passwords';
import type { AuthUser, Role } from './types';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];
  const roles = value.filter((r) => r === 'buyer' || r === 'seller' || r === 'admin');
  return roles as Role[];
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(email: string, password: string): Promise<AuthUser> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Email already exists',
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        roles: ['buyer'],
      },
    });

    return { id: user.id, email: user.email, roles: parseRoles(user.roles) };
  }

  async login(email: string, password: string): Promise<{ user: AuthUser; sessionToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid credentials' });
    }
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid credentials' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);

    const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? 14);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: { id: user.id, email: user.email, roles: parseRoles(user.roles) },
      sessionToken: rawToken,
    };
  }

  async logout(sessionToken: string) {
    const tokenHash = sha256(sessionToken);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async authenticate(sessionToken: string): Promise<AuthUser | null> {
    const tokenHash = sha256(sessionToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now()) return null;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return { id: session.user.id, email: session.user.email, roles: parseRoles(session.user.roles) };
  }
}
