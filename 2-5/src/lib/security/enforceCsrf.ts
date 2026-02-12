import { cookies } from "next/headers";
import { ApiError } from "@/lib/errors/apiError";
import { CSRF_COOKIE } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { enforceRequestIntegrity } from "@/lib/security/requestIntegrity";

export async function enforceCsrf(req: Request, sessionId: string | null) {
  enforceRequestIntegrity(req);

  const header = req.headers.get("x-csrf-token");
  if (!header) throw ApiError.forbidden("缺少 CSRF header");

  const cookieStore = cookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieValue) throw ApiError.forbidden("缺少 CSRF cookie");

  if (cookieValue !== header) throw ApiError.forbidden("CSRF token 不一致");

  verifyCsrfToken(header, sessionId);
}
