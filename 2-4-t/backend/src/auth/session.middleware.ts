import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../shared/db/prisma.service';
import { loadEnv } from '../shared/config/env';

export type RequestUser = { id: string; username: string };

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const sid = (req.cookies?.[this.env.SESSION_COOKIE_NAME] ?? null) as string | null;
    (req as any).user = null;
    (req as any).session = null;

    if (!sid) {
      next();
      return;
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: sid },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      next();
      return;
    }

    (req as any).user = { id: session.user.id, username: session.user.username } satisfies RequestUser;
    (req as any).session = { id: session.id, csrfToken: session.csrfToken };
    next();
  }
}
