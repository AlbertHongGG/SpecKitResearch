import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import { buildFtsQuery } from "@/server/domain/search/buildFtsQuery";

type HitRow = {
  threadId: string;
  score: number | null;
};

export async function searchPublic(params: { q: string; page: number; pageSize: number }) {
  const query = buildFtsQuery(params.q);
  if (!query) throw ApiError.validation(undefined, "q is required");

  const limit = params.pageSize;
  const offset = (params.page - 1) * params.pageSize;

  const rows = await withDbRetry(() =>
    prisma.$queryRaw<HitRow[]>(Prisma.sql`
      WITH
      thread_hits AS (
        SELECT
          threadId as threadId,
          bm25(thread_fts) as score
        FROM thread_fts
        WHERE thread_fts MATCH ${query}
      ),
      post_hits AS (
        SELECT
          threadId as threadId,
          bm25(post_fts) as score
        FROM post_fts
        WHERE post_fts MATCH ${query}
      ),
      hits AS (
        SELECT * FROM thread_hits
        UNION ALL
        SELECT * FROM post_hits
      )
      SELECT
        t.id as threadId,
        MIN(h.score) as score
      FROM hits h
      JOIN Thread t ON t.id = h.threadId
      WHERE t.status IN ('published', 'locked')
      GROUP BY t.id
      ORDER BY score ASC
      LIMIT ${limit} OFFSET ${offset};
    `),
  );

  const threadIds = rows.map((r) => r.threadId);
  if (threadIds.length === 0) {
    return { total: 0, items: [] as any[] };
  }

  // Total is approximate (counting distinct hits can be expensive). Do a separate count for correctness.
  const [{ total }] = await withDbRetry(() =>
    prisma.$queryRaw<{ total: unknown }[]>(Prisma.sql`
      WITH
      thread_hits AS (
        SELECT threadId as threadId FROM thread_fts WHERE thread_fts MATCH ${query}
      ),
      post_hits AS (
        SELECT threadId as threadId FROM post_fts WHERE post_fts MATCH ${query}
      ),
      hits AS (
        SELECT * FROM thread_hits
        UNION
        SELECT * FROM post_hits
      )
      SELECT COUNT(*) as total
      FROM hits h
      JOIN Thread t ON t.id = h.threadId
      WHERE t.status IN ('published', 'locked');
    `),
  );

  const totalNumber = typeof total === "bigint" ? Number(total) : Number(total);

  const threads = await withDbRetry(() =>
    prisma.thread.findMany({
      where: { id: { in: threadIds }, status: { in: ["published", "locked"] } },
      select: {
        id: true,
        boardId: true,
        title: true,
        status: true,
        isPinned: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  );

  const byId = new Map(threads.map((t) => [t.id, t]));
  const items = threadIds.map((id) => byId.get(id)).filter(Boolean);

  return { total: totalNumber, items };
}
