import type { NextFunction, Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';

import { SessionService } from './session.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const cookieName = this.sessions.getCookieName();
    const token =
      (req.cookies?.[cookieName] as string | undefined) ?? undefined;

    req.currentUser = await this.sessions.getCurrentUser(token);
    next();
  }
}
