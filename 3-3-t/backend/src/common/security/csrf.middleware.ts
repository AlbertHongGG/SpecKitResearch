import { Request, Response, NextFunction } from 'express';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    if (!origin && !referer) {
      return res.status(403).json({ code: 'SECURITY_CSRF', message: 'CSRF validation failed' });
    }
  }
  next();
}
