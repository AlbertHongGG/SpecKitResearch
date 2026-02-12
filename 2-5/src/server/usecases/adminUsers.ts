import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/rbac/guards";
import { findUserByEmail, findUserById, setUserBanStatus } from "@/server/repositories/userRepository";
import { audit } from "@/server/usecases/auditLog";

async function resolveUser(params: { userId?: string; userEmail?: string }) {
  if (params.userId) {
    const user = await findUserById(params.userId);
    if (!user) throw ApiError.notFound("User not found");
    return user;
  }
  if (params.userEmail) {
    const user = await findUserByEmail(params.userEmail.trim().toLowerCase());
    if (!user) throw ApiError.notFound("User not found");
    return user;
  }
  throw ApiError.validation(undefined, "userId 或 userEmail 必填");
}

export async function adminUsersSetBanStatus(params: {
  req: Request;
  viewer: Viewer | null;
  userId?: string;
  userEmail?: string;
  isBanned: boolean;
  reason?: string;
}) {
  const viewer = requireAdmin(params.viewer);

  const user = await resolveUser({ userId: params.userId, userEmail: params.userEmail });
  if (user.id === viewer.user.id) throw ApiError.forbidden("不可停權自己");

  const updated = await setUserBanStatus(user.id, params.isBanned);

  await audit(viewer, params.req, {
    action: params.isBanned ? "user.ban" : "user.unban",
    targetType: "user",
    targetId: updated.id,
    metadata: { reason: params.reason ?? null },
  });

  return { ok: true, user: { id: updated.id, isBanned: updated.isBanned } };
}
