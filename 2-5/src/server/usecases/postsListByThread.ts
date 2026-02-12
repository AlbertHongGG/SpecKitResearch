import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canViewPost, canViewThread } from "@/server/domain/visibility";
import { getBoardById } from "@/server/repositories/boardRepository";
import { isModeratorForBoard, isAdmin } from "@/lib/rbac/roles";

export async function postsListByThread(params: {
  threadId: string;
  viewer: Viewer | null;
  page: number;
  pageSize: number;
}) {
  const thread = (await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.threadId } }))) as any;
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = (await getBoardById(thread.boardId)) as any;
  if (!board) throw ApiError.notFound("Board not found");

  if (!canViewThread(params.viewer, board, thread)) {
    throw ApiError.notFound("Thread not found");
  }

  // US1 預設只回傳公開可見；Moderator/Admin 檢視 hidden 由 US3 開始正式使用。
  const canSeeHidden = isAdmin(params.viewer) || isModeratorForBoard(params.viewer, board.id);
  const baseWhere: any = { threadId: thread.id };
  if (!canSeeHidden) baseWhere.status = "visible";

  const [total, items] = await withDbRetry<[number, any[]]>(() =>
    prisma.$transaction([
      prisma.post.count({ where: baseWhere }),
      prisma.post.findMany({
        where: baseWhere,
        orderBy: { createdAt: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]) as any,
  );

  // 二次過濾：避免上面 any 判斷漏網
  const visibleItems = items.filter((p) => canViewPost(params.viewer, board, thread, p));

  return { board, thread, total, items: visibleItems };
}
