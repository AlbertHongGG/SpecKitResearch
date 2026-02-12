import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getThreadForPublic } from "@/src/infra/repos/threadRepo";

export async function getThread(prisma: PrismaClient, threadId: string) {
  const thread = await getThreadForPublic(prisma, threadId);

  // Visibility invariant: hidden/draft must behave like NotFound for guests.
  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }

  return { thread };
}
