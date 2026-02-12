import type { PrismaClient, TargetType } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function setLike(
  prisma: PrismaClient,
  actor: Actor,
  input: { targetType: TargetType; targetId: string; desired: boolean },
) {
  requireAuthenticated(actor);

  // Visibility/integrity checks
  if (input.targetType === "thread") {
    const thread = await prisma.thread.findUnique({
      where: { id: input.targetId },
      select: { id: true, boardId: true, status: true, board: { select: { isActive: true } } },
    });
    if (!thread) throw new AppError(ErrorCodes.NotFound, "Thread not found");
    if (!thread.board.isActive) throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
    if (!["published", "locked"].includes(thread.status)) {
      throw new AppError(ErrorCodes.NotFound, "Thread not found");
    }

    const changed = await transaction(prisma, async (tx) => {
      if (input.desired) {
        await tx.like.upsert({
          where: {
            userId_targetType_targetId: {
              userId: actor.user.id,
              targetType: input.targetType,
              targetId: input.targetId,
            },
          },
          create: {
            userId: actor.user.id,
            targetType: input.targetType,
            targetId: input.targetId,
          },
          update: {},
        });

        await writeAuditInTx(tx, {
          actorId: actor.user.id,
          action: "like.set_true",
          targetType: "thread",
          targetId: input.targetId,
          metadata: { boardId: thread.boardId },
        });

        return true;
      }

      const res = await tx.like.deleteMany({
        where: {
          userId: actor.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      });

      if (res.count > 0) {
        await writeAuditInTx(tx, {
          actorId: actor.user.id,
          action: "like.set_false",
          targetType: "thread",
          targetId: input.targetId,
          metadata: { boardId: thread.boardId },
        });
      }

      return res.count > 0;
    });

    return { isLiked: input.desired ? true : false, changed };
  }

  const post = await prisma.post.findUnique({
    where: { id: input.targetId },
    select: {
      id: true,
      status: true,
      thread: { select: { id: true, boardId: true, status: true, board: { select: { isActive: true } } } },
    },
  });

  if (!post) throw new AppError(ErrorCodes.NotFound, "Post not found");
  if (!post.thread.board.isActive) throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  if (!["published", "locked"].includes(post.thread.status) || post.status !== "visible") {
    throw new AppError(ErrorCodes.NotFound, "Post not found");
  }

  const changed = await transaction(prisma, async (tx) => {
    if (input.desired) {
      await tx.like.upsert({
        where: {
          userId_targetType_targetId: {
            userId: actor.user.id,
            targetType: input.targetType,
            targetId: input.targetId,
          },
        },
        create: {
          userId: actor.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
        },
        update: {},
      });

      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "like.set_true",
        targetType: "post",
        targetId: input.targetId,
        metadata: { threadId: post.thread.id, boardId: post.thread.boardId },
      });

      return true;
    }

    const res = await tx.like.deleteMany({
      where: {
        userId: actor.user.id,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    });

    if (res.count > 0) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "like.set_false",
        targetType: "post",
        targetId: input.targetId,
        metadata: { threadId: post.thread.id, boardId: post.thread.boardId },
      });
    }

    return res.count > 0;
  });

  return { isLiked: input.desired ? true : false, changed };
}
