import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { ErrorCodes } from '../errors/error-codes.js';

type Bucket = { timestamps: number[] };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windowMs: number;
  private readonly maxRequests: number;

  private readonly buckets = new Map<string, Bucket>();

  constructor() {
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
    const maxRequests = Number(process.env.RATE_LIMIT_MAX ?? 60);

    this.windowMs = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;
    this.maxRequests = Number.isFinite(maxRequests) && maxRequests > 0 ? Math.floor(maxRequests) : 60;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const ip =
      (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0]!.trim() : null) ??
      (req as any).ip ??
      (req.socket?.remoteAddress ?? 'unknown');

    const routeKey = (req as any).originalUrl ?? req.url ?? 'unknown';
    const key = `${ip}:${routeKey}`;

    const now = Date.now();
    const cutoff = now - this.windowMs;

    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      throw new HttpException(
        {
        code: ErrorCodes.RATE_LIMITED,
        message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);

    // Prevent unbounded growth in long-lived processes.
    if (this.buckets.size > 10_000) {
      for (const [k, b] of this.buckets.entries()) {
        if (b.timestamps.every((ts) => ts <= cutoff)) {
          this.buckets.delete(k);
        }
      }
    }

    return true;
  }
}
