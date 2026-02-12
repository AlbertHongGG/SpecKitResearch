import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function editPost(
  prisma: PrismaClient,
  actor: Actor,
  input: { postId: string; content: string },
) {
  requireAuthenticated(actor);

  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      threadId: true,
      thread: {
        select: {
          id: true,
          boardId: true,
          status: true,
          board: { select: { isActive: true } },
        },
      },
    },
  });

  if (!post) {
    throw new AppError(ErrorCodes.NotFound, "Post not found");
  }
  if (post.authorId !== actor.user.id) {
    throw new AppError(ErrorCodes.Forbidden, "Only author can edit post");
  }
  if (!post.thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }
  if (post.thread.status === "locked") {
    throw new AppError(ErrorCodes.Forbidden, "Thread is locked");
  }
  if (post.status !== "visible") {
    throw new AppError(ErrorCodes.Forbidden, "Hidden post cannot be edited");
  }

  const updated = await transaction(prisma, async (tx) => {
    const res = await tx.post.update({
      where: { id: input.postId },
      data: { content: input.content },
      select: { id: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "post.edit",
      targetType: "post",
      targetId: res.id,
      metadata: { threadId: post.threadId, boardId: post.thread.boardId },
    });

    return res;
  });

  return { post: updated };
}
