import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireModerationScope } from "@/src/domain/policies/moderatorScope";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transitionPost } from "@/src/domain/state-machines/postState";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function hidePost(prisma: PrismaClient, actor: Actor, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, thread: { select: { id: true, boardId: true } } },
  });
  if (!post) throw new AppError(ErrorCodes.NotFound, "Post not found");

  requireModerationScope(actor, post.thread.boardId);

  if (post.status === "hidden") {
    return { post: { id: post.id, status: post.status } };
  }

  const nextStatus = transitionPost(post.status, "hidden");
  const updated = await transaction(prisma, async (tx) => {
    const p = await tx.post.update({
      where: { id: post.id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    if (actor.authenticated) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "post.hide",
        targetType: "post",
        targetId: p.id,
        metadata: { boardId: post.thread.boardId, threadId: post.thread.id },
      });
    }

    return p;
  });

  return { post: { id: updated.id, status: updated.status } };
}

export async function unhidePost(prisma: PrismaClient, actor: Actor, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, thread: { select: { id: true, boardId: true } } },
  });
  if (!post) throw new AppError(ErrorCodes.NotFound, "Post not found");

  requireModerationScope(actor, post.thread.boardId);

  if (post.status === "visible") {
    return { post: { id: post.id, status: post.status } };
  }

  const nextStatus = transitionPost(post.status, "visible");
  const updated = await transaction(prisma, async (tx) => {
    const p = await tx.post.update({
      where: { id: post.id },
      data: { status: nextStatus },
      select: { id: true, status: true },
    });

    if (actor.authenticated) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "post.unhide",
        targetType: "post",
        targetId: p.id,
        metadata: { boardId: post.thread.boardId, threadId: post.thread.id },
      });
    }

    return p;
  });

  return { post: { id: updated.id, status: updated.status } };
}
