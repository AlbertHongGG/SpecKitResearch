import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getThreadForPublic } from "@/src/infra/repos/threadRepo";
import { decodePostCursor, listPublicPostsByThreadPage } from "@/src/infra/repos/postRepo";

export async function listPostsPage(
  prisma: PrismaClient,
  threadId: string,
  input: { cursor?: string | null; limit?: number } = {},
) {
  const thread = await getThreadForPublic(prisma, threadId);
  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }

  const cursor = input.cursor ? decodePostCursor(input.cursor) : null;
  if (input.cursor && !cursor) {
    throw new AppError(ErrorCodes.ValidationError, "Invalid cursor");
  }

  const limit = input.limit ?? 50;
  const result = await listPublicPostsByThreadPage(prisma, threadId, { cursor, limit });

  return {
    posts: result.posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    nextCursor: result.nextCursor,
  };
}
