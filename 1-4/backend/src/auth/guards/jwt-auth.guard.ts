import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientKey(req: Request) {
  const ip = req.ip || 'unknown-ip';
  const path = req.path || 'unknown-path';
  return `${ip}:${path}`;
}

function consume(params: {
  key: string;
  nowMs: number;
  windowMs: number;
  max: number;
}) {
  const existing = buckets.get(params.key);

  if (!existing || params.nowMs >= existing.resetAtMs) {
    buckets.set(params.key, {
      count: 1,
      resetAtMs: params.nowMs + params.windowMs,
    });
    return { ok: true } as const;
  }

  if (existing.count >= params.max) {
    return { ok: false } as const;
  }

  existing.count += 1;
  return { ok: true } as const;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const key = getClientKey(req);
    const nowMs = Date.now();

    // Basic, in-memory rate limiting for auth endpoints (Polish T109).
    // Safe default that should not affect normal usage or test runs.
    const result = consume({
      key,
      nowMs,
      windowMs: 60_000,
      max: 20,
    });

    // Prevent unbounded memory growth.
    if (buckets.size > 10_000) buckets.clear();

    if (!result.ok) {
      throw new AppError({
        status: 429,
        code: ErrorCodes.TOO_MANY_REQUESTS,
        message: 'Too many auth requests, try again',
      });
    }

    return true;
  }
}
