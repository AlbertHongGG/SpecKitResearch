import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../modules/db/prisma.service';
import { SESSION_COOKIE } from '../modules/auth/session.service';
import { getContext, setContext } from '../common/request-context';

export function makeAuthSessionMiddleware(prisma: PrismaService) {
  return async function authSessionMiddleware(req: Request, _res: Response, next: NextFunction) {
    const ctx = (() => {
      try {
        return getContext(req);
      } catch {
        return { requestId: 'unknown' };
      }
    })();

    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      setContext(req, ctx);
      return next();
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      setContext(req, ctx);
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      setContext(req, ctx);
      return next();
    }

    setContext(req, {
      ...ctx,
      session: { id: session.id, activeOrgId: session.activeOrgId },
      user: { id: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
    });

    next();
  };
}
