import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = {
  count: number;
  resetAtMs: number;
};

@Injectable()
export class AntiAbuseService {
  private readonly buckets = new Map<string, Bucket>();

  // Minimal in-memory limiter (dev / single instance). Defense-in-depth only.
  private readonly windowMs = 60_000;
  private readonly maxPerWindow = 20;

  checkOrThrow(key: string) {
    const now = Date.now();
    const b = this.buckets.get(key);

    if (!b || now >= b.resetAtMs) {
      this.buckets.set(key, { count: 1, resetAtMs: now + this.windowMs });
      return;
    }

    b.count += 1;
    if (b.count > this.maxPerWindow) {
      const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAtMs - now) / 1000));
      throw new HttpException(
        {
          message: 'Too many requests',
          details: { retry_after_seconds: retryAfterSeconds }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
