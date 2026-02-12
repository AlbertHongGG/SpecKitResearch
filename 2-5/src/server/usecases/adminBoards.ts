import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/rbac/guards";
import { isUniqueConstraintError } from "@/server/domain/prismaErrors";
import { getBoardById, listBoards } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function adminBoardsList(viewer: Viewer | null) {
  requireAdmin(viewer);
  return listBoards();
}

export async function adminBoardsCreate(params: {
  req: Request;
  viewer: Viewer | null;
  name: string;
  description: string;
  sortOrder: number;
}) {
  const viewer = requireAdmin(params.viewer);

  try {
    const board = await withDbRetry(() =>
      prisma.board.create({
        data: {
          name: params.name,
          description: params.description,
          isActive: true,
          sortOrder: params.sortOrder,
        },
      }),
    );

    await audit(viewer, params.req, {
      action: "board.create",
      targetType: "board",
      targetId: board.id,
      metadata: { name: board.name, sortOrder: board.sortOrder },
    });

    return { board };
  } catch (err) {
    if (isUniqueConstraintError(err)) throw ApiError.conflict("看板名稱已存在");
    throw err;
  }
}

export async function adminBoardsUpdate(params: {
  req: Request;
  viewer: Viewer | null;
  boardId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const viewer = requireAdmin(params.viewer);

  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  const data: any = {};
  if (typeof params.name === "string") data.name = params.name;
  if (typeof params.description === "string") data.description = params.description;
  if (typeof params.isActive === "boolean") data.isActive = params.isActive;
  if (typeof params.sortOrder === "number") data.sortOrder = params.sortOrder;

  if (Object.keys(data).length === 0) throw ApiError.validation(undefined, "沒有要更新的欄位");

  try {
    const updated = await withDbRetry(() => prisma.board.update({ where: { id: board.id }, data }));

    const action =
      typeof params.isActive === "boolean" && params.isActive === false
        ? "board.deactivate"
        : "board.update";

    await audit(viewer, params.req, {
      action,
      targetType: "board",
      targetId: updated.id,
      metadata: { patch: data },
    });

    return { board: updated };
  } catch (err) {
    if (isUniqueConstraintError(err)) throw ApiError.conflict("看板名稱已存在");
    throw err;
  }
}

export async function adminBoardsReorder(params: {
  req: Request;
  viewer: Viewer | null;
  reorder: Array<{ boardId: string; sortOrder: number }>;
}) {
  const viewer = requireAdmin(params.viewer);
  if (params.reorder.length === 0) throw ApiError.validation(undefined, "reorder 不可為空");

  const ids = params.reorder.map((x) => x.boardId);
  const existing = await withDbRetry(() => prisma.board.findMany({ where: { id: { in: ids } }, select: { id: true } }));
  if (existing.length !== ids.length) throw ApiError.notFound("Board not found");

  await withDbRetry(() =>
    prisma.$transaction(
      params.reorder.map((x) => prisma.board.update({ where: { id: x.boardId }, data: { sortOrder: x.sortOrder } })),
    ),
  );

  await audit(viewer, params.req, {
    action: "board.reorder",
    targetType: "board",
    targetId: "bulk",
    metadata: { reorder: params.reorder },
  });

  const boards = await listBoards();
  return { boards };
}
