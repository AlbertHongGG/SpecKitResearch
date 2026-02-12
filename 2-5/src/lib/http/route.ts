import { ensureDbReady } from "@/db/prisma";
import { ApiError } from "@/lib/errors/apiError";
import { errorToResponse } from "@/lib/errors/toResponse";
import { getOrCreateRequestId } from "@/lib/observability/requestId";
import { optionalViewerFromRequest, requireViewerFromRequest } from "@/lib/auth/guards";
import { enforceCsrf } from "@/lib/security/enforceCsrf";

export type RouteContext = {
  requestId: string;
  viewer: Awaited<ReturnType<typeof optionalViewerFromRequest>>;
};

export type NextRouteContext = {
  params?: Record<string, string | string[]>;
};

type Options = {
  auth?: "optional" | "required";
  csrf?: boolean;
};

export function withRoute(
  handler: (req: Request, ctx: RouteContext, next?: NextRouteContext) => Promise<Response>,
  opts: Options = { auth: "optional", csrf: false },
) {
  return async function route(req: Request, next?: NextRouteContext) {
    const requestId = getOrCreateRequestId(req);

    try {
      await ensureDbReady();

      const viewer =
        opts.auth === "required" ? await requireViewerFromRequest(req) : await optionalViewerFromRequest(req);

      if (opts.csrf) {
        await enforceCsrf(req, viewer?.sessionId ?? null);
      }

      const res = await handler(req, { requestId, viewer }, next);
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof ApiError) return errorToResponse(err, requestId);
      return errorToResponse(ApiError.internal(), requestId);
    }
  };
}
