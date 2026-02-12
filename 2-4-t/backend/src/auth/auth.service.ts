import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sid = randomUUID();
    const csrfToken = randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await this.prisma.authSession.create({
      data: {
        id: sid,
        userId: user.id,
        csrfToken,
        expiresAt
      }
    });

    return { user: { id: user.id, username: user.username }, sid, csrfToken };
  }

  async logout(sid: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sid, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async getSession(sid: string | null) {
    if (!sid) {
      return { user: null as any, csrfToken: null as any };
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: sid },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return { user: null as any, csrfToken: null as any };
    }

    return {
      user: { id: session.user.id, username: session.user.username },
      csrfToken: session.csrfToken
    };
  }
}
