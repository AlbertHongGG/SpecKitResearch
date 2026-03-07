import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toErrorResponse } from "../errors/toErrorResponse";
import { attachRequestId, getOrCreateRequestId } from "../observability/requestId";
import { createLogger, type Logger } from "../observability/logger";
import { requireCsrf } from "@/src/infra/auth/csrf";
import { requireRateLimit } from "@/src/lib/http/rateLimit";
import { getAllowedOrigins } from "@/src/lib/env";

export type RouteCtx<TParams extends Record<string, string> = Record<string, string>> = {
  params: TParams;
  requestId: string;
  logger: Logger;
};

export type RouteHandler<TParams extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteCtx<TParams>,
) => Promise<NextResponse>;

type RouteOptions = {
  csrf?: "auto" | "none";
};

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function attachCorsHeaders(req: NextRequest, res: NextResponse) {
  const requestOrigin = req.headers.get("origin");
  if (!requestOrigin) return res;

  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(requestOrigin)) return res;

  res.headers.set("Access-Control-Allow-Origin", requestOrigin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Vary", "Origin");
  return res;
}

export function route<TParams extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<TParams>,
  options: RouteOptions = { csrf: "auto" },
) {
  return async (req: NextRequest, ctx: { params: Promise<TParams> | TParams }) => {
    const requestId = getOrCreateRequestId(req);
    const logger = createLogger(requestId);

    try {
      if (process.env.DISABLE_RATE_LIMIT !== "1" && isUnsafeMethod(req.method)) {
        requireRateLimit(req, { max: 500, windowMs: 60_000, keyPrefix: "write" });
      }

      if (options.csrf !== "none" && isUnsafeMethod(req.method)) {
        requireCsrf(req);
      }

      const params = await Promise.resolve(ctx.params);
      const res = await handler(req, { params, requestId, logger });
      return attachCorsHeaders(req, attachRequestId(res, requestId));
    } catch (err) {
      const serializedError =
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : { value: err };

      logger.error("Route error", {
        method: req.method,
        path: req.nextUrl.pathname,
        error: serializedError,
      });

      const res = toErrorResponse(err, requestId);
      return attachCorsHeaders(req, attachRequestId(res, requestId));
    }
  };
}
