import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/rbac/roles";

export function requireAdmin(viewer: Viewer | null): Viewer {
  if (!viewer) throw ApiError.notAuthenticated();
  if (viewer.user.isBanned) throw ApiError.forbidden("帳號已停權");
  if (!isAdmin(viewer)) throw ApiError.forbidden("需要管理員權限");
  return viewer;
}
