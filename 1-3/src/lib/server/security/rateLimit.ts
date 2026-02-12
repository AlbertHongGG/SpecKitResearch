import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/shared/apiError';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri;
  return 'unknown';
}

export function assertRateLimit(
  req: NextRequest,
  opts: {
    key: string;
    limit: number;
    windowMs: number;
  },
) {
  // Avoid flakiness in tests; focus on business rules in the suite.
  if (process.env.NODE_ENV === 'test') return;

  const ip = getClientIp(req);
  const now = Date.now();
  const bucketKey = `${opts.key}:${ip}`;

  const cur = buckets.get(bucketKey);
  if (!cur || now >= cur.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  cur.count += 1;
  if (cur.count > opts.limit) {
    throw new ApiError({ status: 429, code: 'RATE_LIMITED', message: '請稍後再試' });
  }
}
