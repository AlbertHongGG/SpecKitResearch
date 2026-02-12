import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    } | null;
    sessionId?: string | null;
  }
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'session_id';
    const sessionId = req.cookies?.[cookieName];
    if (!sessionId) {
      req.user = null;
      req.sessionId = null;
      return next();
    }
    const session = await this.sessions.getValidSession(sessionId);
    if (!session) {
      req.user = null;
      req.sessionId = null;
      return next();
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
    req.sessionId = session.id;
    return next();
  }
}
