import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canModerateBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";

export type ReportListItem =
  | {
      report: {
        id: string;
        reporterId: string;
        targetType: "thread";
        targetId: string;
        reason: string;
        status: string;
        createdAt: string;
      };
      thread: { id: string; title: string; status: string };
    }
  | {
      report: {
        id: string;
        reporterId: string;
        targetType: "post";
        targetId: string;
        reason: string;
        status: string;
        createdAt: string;
      };
      thread: { id: string; title: string; status: string };
      post: { id: string; content: string; status: string };
    };

type RawRow = {
  reportId: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  threadId: string;
  threadTitle: string;
  threadStatus: string;
  postId: string | null;
  postContent: string | null;
  postStatus: string | null;
};

export async function reportsListByBoard(params: {
  boardId: string;
  viewer: Viewer;
  status?: "pending" | "accepted" | "rejected";
  page: number;
  pageSize: number;
}) {
  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  const statusFilter = params.status
    ? Prisma.sql` AND r.status = ${params.status} `
    : Prisma.empty;

  const baseUnion = Prisma.sql`
    SELECT
      r.id AS reportId,
      r.reporterId AS reporterId,
      r.targetType AS targetType,
      r.targetId AS targetId,
      r.reason AS reason,
      r.status AS status,
      r.createdAt AS createdAt,
      t.id AS threadId,
      t.title AS threadTitle,
      t.status AS threadStatus,
      NULL AS postId,
      NULL AS postContent,
      NULL AS postStatus
    FROM Report r
    JOIN Thread t ON r.targetType = 'thread' AND r.targetId = t.id
    WHERE t.boardId = ${board.id}
    ${statusFilter}

    UNION ALL

    SELECT
      r.id AS reportId,
      r.reporterId AS reporterId,
      r.targetType AS targetType,
      r.targetId AS targetId,
      r.reason AS reason,
      r.status AS status,
      r.createdAt AS createdAt,
      t.id AS threadId,
      t.title AS threadTitle,
      t.status AS threadStatus,
      p.id AS postId,
      p.content AS postContent,
      p.status AS postStatus
    FROM Report r
    JOIN Post p ON r.targetType = 'post' AND r.targetId = p.id
    JOIN Thread t ON t.id = p.threadId
    WHERE t.boardId = ${board.id}
    ${statusFilter}
  `;

  const offset = (params.page - 1) * params.pageSize;

  const totalRows = await withDbRetry(() =>
    prisma.$queryRaw<{ total: bigint | number }[]>(Prisma.sql`
      SELECT COUNT(*) AS total
      FROM ( ${baseUnion} ) x
    `),
  );

  const totalRaw = totalRows[0]?.total ?? 0;
  const total = typeof totalRaw === "bigint" ? Number(totalRaw) : Number(totalRaw);

  const rows = await withDbRetry(() =>
    prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT *
      FROM ( ${baseUnion} ) x
      ORDER BY datetime(createdAt) DESC
      LIMIT ${params.pageSize} OFFSET ${offset}
    `),
  );

  const items: ReportListItem[] = rows.map((r) => {
    if (r.targetType === "thread") {
      return {
        report: {
          id: r.reportId,
          reporterId: r.reporterId,
          targetType: "thread",
          targetId: r.targetId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
        },
        thread: { id: r.threadId, title: r.threadTitle, status: r.threadStatus },
      };
    }

    return {
      report: {
        id: r.reportId,
        reporterId: r.reporterId,
        targetType: "post",
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      },
      thread: { id: r.threadId, title: r.threadTitle, status: r.threadStatus },
      post: {
        id: r.postId!,
        content: (r.postContent ?? "").slice(0, 300),
        status: r.postStatus ?? "",
      },
    };
  });

  return { board, total, items };
}
