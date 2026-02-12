import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canPostToBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function threadsCreate(params: {
  req: Request;
  viewer: Viewer;
  boardId: string;
  title: string;
  content: string;
  intent: "save_draft" | "publish";
}) {
  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");

  const status = params.intent === "publish" ? "published" : "draft";

  const thread = await withDbRetry(() =>
    prisma.thread.create({
      data: {
        boardId: board.id,
        authorId: params.viewer.user.id,
        title: params.title,
        content: params.content,
        status,
        isPinned: false,
        isFeatured: false,
      },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "thread.create",
    targetType: "thread",
    targetId: thread.id,
    metadata: { intent: params.intent, boardId: board.id, status },
  });

  return { thread };
}
