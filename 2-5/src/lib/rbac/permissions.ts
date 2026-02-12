import type { Board, Thread } from "@prisma/client";
import type { Viewer } from "@/lib/auth/session";
import { isAdmin, isModeratorForBoard } from "@/lib/rbac/roles";

export function canPostToBoard(viewer: Viewer | null, board: Board) {
  if (!viewer) return false;
  if (viewer.user.isBanned) return false;
  if (!board.isActive) return false;
  return true;
}

export function canModerateBoard(viewer: Viewer | null, boardId: string) {
  return isModeratorForBoard(viewer, boardId);
}

export function canReplyToThread(viewer: Viewer | null, board: Board, thread: Thread) {
  if (!viewer) return false;
  if (viewer.user.isBanned) return false;
  if (!board.isActive) return false;
  if (thread.status === "locked") return false;
  if (thread.status === "hidden") return false;
  if (thread.status === "draft") return false;
  return true;
}

export function canEditThread(viewer: Viewer | null, thread: Thread) {
  if (!viewer) return false;
  if (viewer.user.isBanned) return false;
  if (isAdmin(viewer)) return true;
  return thread.authorId === viewer.user.id;
}
