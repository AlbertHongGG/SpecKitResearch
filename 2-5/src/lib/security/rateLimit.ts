import { ApiError } from "@/lib/errors/apiError";

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

function now() {
  return Date.now();
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function enforceRateLimit(req: Request, opts: { name: string; limit: number; windowMs: number }) {
  const ip = getIp(req);
  const key = `${opts.name}:${ip}`;
  const t = now();

  const existing = buckets.get(key);
  if (!existing || t >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: t + opts.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    throw ApiError.tooManyRequests("操作過於頻繁，請稍後再試");
  }
}
