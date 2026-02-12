import type { NextFunction, Request, Response } from 'express';
import { ForbiddenException } from '@nestjs/common';

export class OriginCheckMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next();
    }

    const origin = req.header('origin');
    if (!origin) return next();

    const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!allowed.includes(origin)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Origin not allowed',
      });
    }

    return next();
  }
}
