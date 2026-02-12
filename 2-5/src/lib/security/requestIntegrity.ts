import { ApiError } from "@/lib/errors/apiError";

export function enforceRequestIntegrity(req: Request) {
  const url = new URL(req.url);

  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite.toLowerCase() === "cross-site") {
    throw ApiError.forbidden("跨站請求已被拒絕");
  }

  const origin = req.headers.get("origin");
  if (origin) {
    const originUrl = new URL(origin);
    if (originUrl.origin !== url.origin) {
      throw ApiError.forbidden("Origin 不符");
    }
  }
}
