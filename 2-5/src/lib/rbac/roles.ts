import type { Viewer } from "@/lib/auth/session";

export function isAdmin(viewer: Viewer | null) {
  return viewer?.user.role === "admin";
}

export function isModeratorForBoard(viewer: Viewer | null, boardId: string) {
  return !!viewer && (isAdmin(viewer) || viewer.moderatorBoards.includes(boardId));
}
