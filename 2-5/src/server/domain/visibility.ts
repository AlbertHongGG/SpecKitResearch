import type { Board, Post, Thread } from "@prisma/client";
import type { Viewer } from "@/lib/auth/session";
import { isAdmin, isModeratorForBoard } from "@/lib/rbac/roles";

export function canViewBoard(_viewer: Viewer | null, _board: Board) {
  return true;
}

export function canViewThread(viewer: Viewer | null, board: Board, thread: Thread) {
  if (!canViewBoard(viewer, board)) return false;

  if (thread.status === "published" || thread.status === "locked") return true;

  if (thread.status === "draft") {
    return !!viewer && thread.authorId === viewer.user.id;
  }

  if (thread.status === "hidden") {
    return isAdmin(viewer) || isModeratorForBoard(viewer, board.id);
  }

  return false;
}

export function canViewPost(viewer: Viewer | null, board: Board, thread: Thread, post: Post) {
  if (!canViewThread(viewer, board, thread)) return false;
  if (post.status === "visible") return true;
  return isAdmin(viewer) || isModeratorForBoard(viewer, board.id);
}
