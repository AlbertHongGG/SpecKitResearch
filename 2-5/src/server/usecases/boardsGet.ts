import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canModerateBoard, canPostToBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";

export async function boardsGet(params: { boardId: string; viewer: Viewer | null }) {
  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  return {
    board,
    permissions: {
      canPost: canPostToBoard(params.viewer, board),
      canModerate: canModerateBoard(params.viewer, board.id),
    },
  };
}
