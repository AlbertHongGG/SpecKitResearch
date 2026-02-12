import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/rbac/guards";
import { isUniqueConstraintError } from "@/server/domain/prismaErrors";
import { getBoardById } from "@/server/repositories/boardRepository";
import { setModeratorAssignment } from "@/server/repositories/moderatorRepository";
import { findUserByEmail, findUserById } from "@/server/repositories/userRepository";
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

export async function adminModeratorsSetAssignment(params: {
  req: Request;
  viewer: Viewer | null;
  boardId: string;
  action: "assign" | "remove";
  userId?: string;
  userEmail?: string;
}) {
  const viewer = requireAdmin(params.viewer);

  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  const user = await resolveUser({ userId: params.userId, userEmail: params.userEmail });

  try {
    await setModeratorAssignment({ boardId: board.id, userId: user.id, action: params.action });
  } catch (err) {
    if (params.action === "assign" && isUniqueConstraintError(err)) {
      // Idempotent assign
    } else {
      throw err;
    }
  }

  await audit(viewer, params.req, {
    action: params.action === "assign" ? "moderator.assign" : "moderator.remove",
    targetType: "board",
    targetId: board.id,
    metadata: { userId: user.id },
  });

  return { ok: true };
}
