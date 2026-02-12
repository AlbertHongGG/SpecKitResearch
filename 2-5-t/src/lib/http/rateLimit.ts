import type { NextRequest } from "next/server";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";

  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();

  return "unknown";
}

function cleanup(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function requireRateLimit(
  req: NextRequest,
  opts: {
    max: number;
    windowMs: number;
    keyPrefix?: string;
  },
) {
  const now = Date.now();
  cleanup(now);

  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  const key = `${opts.keyPrefix ?? "rl"}:${ip}:${method}:${path}`;

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count <= opts.max) return;

  const retryAfterMs = Math.max(0, existing.resetAt - now);
  throw new AppError(ErrorCodes.RateLimited, "Too many requests", { retryAfterMs });
}
