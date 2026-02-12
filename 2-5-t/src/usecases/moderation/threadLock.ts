import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireModerationScope } from "@/src/domain/policies/moderatorScope";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transitionThread } from "@/src/domain/state-machines/threadState";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function lockThread(prisma: PrismaClient, actor: Actor, threadId: string) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, status: true, boardId: true },
  });
  if (!thread) throw new AppError(ErrorCodes.NotFound, "Thread not found");

  requireModerationScope(actor, thread.boardId);

  if (thread.status === "locked") {
    return { thread: { id: thread.id, status: thread.status } };
  }

  const nextStatus = transitionThread(thread.status, "locked");
  const updated = await transaction(prisma, async (tx) => {
    const t = await tx.thread.update({
      where: { id: thread.id },
      data: { status: nextStatus },
      select: { id: true, status: true, boardId: true },
    });

    if (actor.authenticated) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "thread.lock",
        targetType: "thread",
        targetId: t.id,
        metadata: { boardId: t.boardId },
      });
    }

    return t;
  });

  return { thread: { id: updated.id, status: updated.status } };
}

export async function unlockThread(prisma: PrismaClient, actor: Actor, threadId: string) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, status: true, boardId: true },
  });
  if (!thread) throw new AppError(ErrorCodes.NotFound, "Thread not found");

  requireModerationScope(actor, thread.boardId);

  if (thread.status === "published") {
    return { thread: { id: thread.id, status: thread.status } };
  }

  const nextStatus = transitionThread(thread.status, "published");
  const updated = await transaction(prisma, async (tx) => {
    const t = await tx.thread.update({
      where: { id: thread.id },
      data: { status: nextStatus },
      select: { id: true, status: true, boardId: true },
    });

    if (actor.authenticated) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "thread.unlock",
        targetType: "thread",
        targetId: t.id,
        metadata: { boardId: t.boardId },
      });
    }

    return t;
  });

  return { thread: { id: updated.id, status: updated.status } };
}
