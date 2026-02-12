import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function createPost(
  prisma: PrismaClient,
  actor: Actor,
  input: { threadId: string; content: string },
) {
  requireAuthenticated(actor);

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: {
      id: true,
      boardId: true,
      status: true,
      board: { select: { isActive: true } },
    },
  });

  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }
  if (!thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }
  if (thread.status !== "published") {
    // locked/hidden/draft: no replies
    throw new AppError(ErrorCodes.Forbidden, "Thread is not replyable", { status: thread.status });
  }

  const post = await transaction(prisma, async (tx) => {
    const created = await tx.post.create({
      data: {
        threadId: input.threadId,
        authorId: actor.user.id,
        content: input.content,
        status: "visible",
      },
      select: { id: true, status: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "post.create",
      targetType: "post",
      targetId: created.id,
      metadata: { threadId: input.threadId, boardId: thread.boardId },
    });

    return created;
  });

  return { post };
}
