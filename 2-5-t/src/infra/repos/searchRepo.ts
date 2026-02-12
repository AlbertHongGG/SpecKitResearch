import type { PrismaClient, ThreadStatus } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";
import { normalizePagination } from "@/src/infra/repos/threadRepo";

export type SearchThreadResult = {
  id: string;
  boardId: string;
  title: string;
  createdAt: Date;
};

function buildFtsQuery(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const terms = trimmed
    .split(/\s+/)
    .map((t) => t.replace(/["'\\*]/g, ""))
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (terms.length === 0) return null;
  return terms.map((t) => `${t}*`).join(" AND ");
}

export async function searchPublicThreads(
  prisma: PrismaClient,
  q: string,
  page: number,
  pageSize: number,
) {
  await ensureDbReady();

  const query = buildFtsQuery(q);
  if (!query) {
    return {
      results: [] as SearchThreadResult[],
      pageInfo: { page: 1, pageSize: normalizePagination(1, pageSize).pageSize, total: 0 },
    };
  }

  const visibleStatuses: ThreadStatus[] = ["published", "locked"];
  const p = normalizePagination(page, pageSize);

  const status0 = visibleStatuses[0];
  const status1 = visibleStatuses[1];
  const offset = (p.page - 1) * p.pageSize;

  const totalRows = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(DISTINCT t.id) AS total
    FROM thread_fts f
    JOIN Thread t ON t.id = f.threadId
    WHERE thread_fts MATCH ${query}
      AND t.status IN (${status0}, ${status1})
  `;

  const rawTotal = (totalRows[0] as unknown as { total?: unknown } | undefined)?.total;
  const total =
    typeof rawTotal === "bigint"
      ? Number(rawTotal)
      : typeof rawTotal === "number"
        ? rawTotal
        : 0;

  const results = await prisma.$queryRaw<SearchThreadResult[]>`
    SELECT DISTINCT
      t.id as id,
      t.boardId as boardId,
      t.title as title,
      t.createdAt as createdAt
    FROM thread_fts f
    JOIN Thread t ON t.id = f.threadId
    WHERE thread_fts MATCH ${query}
      AND t.status IN (${status0}, ${status1})
    ORDER BY bm25(thread_fts), t.createdAt DESC
    LIMIT ${p.pageSize} OFFSET ${offset}
  `;

  return {
    results,
    pageInfo: { page: p.page, pageSize: p.pageSize, total },
  };
}
