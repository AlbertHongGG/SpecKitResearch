import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ErrorCodes } from '../http/error-codes';

type Options = {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  name?: string;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

function defaultKey(req: Request) {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';
  return ip;
}

export function rateLimit(options: Options) {
  const name = options.name ?? 'rate_limit';
  const keyFn = options.key ?? defaultKey;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const keyRaw = `${name}:${keyFn(req)}`;
    const key = crypto.createHash('sha256').update(keyRaw).digest('hex');

    const t = now();
    const existing = buckets.get(key);
    const windowResetAt = t + options.windowMs;

    const bucket: Bucket =
      !existing || existing.resetAt <= t ? { count: 0, resetAt: windowResetAt } : existing;

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      res.status(429).json({
        requestId: (req as any).requestId ?? 'unknown',
        error: {
          code: ErrorCodes.RATE_LIMITED,
          message: 'Too many requests',
          details: { name },
        },
      });
      return;
    }

    next();
  };
}
