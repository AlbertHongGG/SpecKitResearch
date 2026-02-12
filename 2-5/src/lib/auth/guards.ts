import { cookies } from "next/headers";
import { ApiError } from "@/lib/errors/apiError";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { getViewerBySessionId } from "@/lib/auth/session";

export async function optionalViewerFromRequest(_req: Request) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const viewer = await getViewerBySessionId(sessionId);
  if (!viewer) return null;

  // Banned users are treated as unauthenticated for write operations.
  return viewer;
}

export async function requireViewerFromRequest(req: Request) {
  const viewer = await optionalViewerFromRequest(req);
  if (!viewer) throw ApiError.notAuthenticated();
  if (viewer.user.isBanned) throw ApiError.forbidden("帳號已停權");
  return viewer;
}
