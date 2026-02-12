import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getThreadForPublic } from "@/src/infra/repos/threadRepo";
import { listPublicPostsByThread } from "@/src/infra/repos/postRepo";

export async function listPosts(prisma: PrismaClient, threadId: string) {
  const thread = await getThreadForPublic(prisma, threadId);
  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }

  const posts = await listPublicPostsByThread(prisma, threadId);
  return { posts };
}
