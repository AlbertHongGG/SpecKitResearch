import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireModerationScope } from "@/src/domain/policies/moderatorScope";
import { resolveReport as resolveReportSm } from "@/src/domain/state-machines/reportState";
import { transitionThread } from "@/src/domain/state-machines/threadState";
import { transitionPost } from "@/src/domain/state-machines/postState";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function resolveReport(
  prisma: PrismaClient,
  actor: Actor,
  reportId: string,
  input: { action: "accept" | "reject"; note?: string },
) {
  if (!actor.authenticated) {
    throw new AppError(ErrorCodes.Unauthenticated, "Login required");
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      boardId: true,
      status: true,
      targetType: true,
      targetId: true,
    },
  });
  if (!report) throw new AppError(ErrorCodes.NotFound, "Report not found");

  requireModerationScope(actor, report.boardId);

  const next = input.action === "accept" ? "accepted" : "rejected";
  const effect = resolveReportSm(report.status, next);

  const resolved = await transaction(prisma, async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status: effect.status,
        resolvedById: actor.user.id,
        resolvedAt: new Date(),
        note: input.note,
      },
      select: { id: true, status: true, resolvedById: true, resolvedAt: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: input.action === "accept" ? "report.accept" : "report.reject",
      targetType: "report",
      targetId: reportId,
      metadata: { boardId: report.boardId, targetType: report.targetType, targetId: report.targetId },
    });

    if (effect.shouldHideTarget) {
      if (report.targetType === "thread") {
        const thread = await tx.thread.findUnique({
          where: { id: report.targetId },
          select: { id: true, status: true, boardId: true },
        });
        if (!thread) throw new AppError(ErrorCodes.NotFound, "Thread not found");
        if (thread.boardId !== report.boardId) {
          throw new AppError(ErrorCodes.Forbidden, "Scope mismatch");
        }

        if (thread.status !== "hidden") {
          const nextStatus = transitionThread(thread.status, "hidden");
          await tx.thread.update({ where: { id: thread.id }, data: { status: nextStatus } });

          await writeAuditInTx(tx, {
            actorId: actor.user.id,
            action: "thread.hide",
            targetType: "thread",
            targetId: thread.id,
            metadata: { boardId: thread.boardId, reason: "report.accept" },
          });
        }
      } else {
        const post = await tx.post.findUnique({
          where: { id: report.targetId },
          select: { id: true, status: true, thread: { select: { id: true, boardId: true } } },
        });
        if (!post) throw new AppError(ErrorCodes.NotFound, "Post not found");
        if (post.thread.boardId !== report.boardId) {
          throw new AppError(ErrorCodes.Forbidden, "Scope mismatch");
        }

        if (post.status !== "hidden") {
          const nextStatus = transitionPost(post.status, "hidden");
          await tx.post.update({ where: { id: post.id }, data: { status: nextStatus } });

          await writeAuditInTx(tx, {
            actorId: actor.user.id,
            action: "post.hide",
            targetType: "post",
            targetId: post.id,
            metadata: { boardId: post.thread.boardId, threadId: post.thread.id, reason: "report.accept" },
          });
        }
      }
    }

    return updatedReport;
  });

  return {
    report: {
      id: resolved.id,
      status: resolved.status,
      resolvedBy: resolved.resolvedById,
      resolvedAt: resolved.resolvedAt.toISOString(),
    },
  };
}
