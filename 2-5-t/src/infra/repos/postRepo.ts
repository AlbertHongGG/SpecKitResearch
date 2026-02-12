import type { PrismaClient } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";

export type PostCursor = { createdAt: Date; id: string };

export function encodePostCursor(cursor: PostCursor): string {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }), "utf8").toString(
    "base64url",
  );
}

export function decodePostCursor(raw: string): PostCursor | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { createdAt?: unknown; id?: unknown };
    if (typeof parsed?.createdAt !== "string" || typeof parsed?.id !== "string") return null;
    const createdAt = new Date(parsed.createdAt);
    if (!Number.isFinite(createdAt.valueOf())) return null;
    if (!parsed.id.trim()) return null;
    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

export async function listPublicPostsByThread(prisma: PrismaClient, threadId: string) {
  await ensureDbReady();

  return prisma.post.findMany({
    where: {
      threadId,
      status: "visible",
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      threadId: true,
      authorId: true,
      content: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function listPublicPostsByThreadPage(
  prisma: PrismaClient,
  threadId: string,
  input: { cursor?: PostCursor | null; limit: number },
) {
  await ensureDbReady();

  const limit = normalizeLimit(input.limit);
  const cursor = input.cursor ?? null;

  const baseWhere = {
    threadId,
    status: "visible" as const,
  };

  const where = cursor
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      }
    : baseWhere;

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    select: {
      id: true,
      threadId: true,
      authorId: true,
      content: true,
      status: true,
      createdAt: true,
    },
  });

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = page.length ? page[page.length - 1] : null;

  return {
    posts: page,
    nextCursor: hasMore && last ? encodePostCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
