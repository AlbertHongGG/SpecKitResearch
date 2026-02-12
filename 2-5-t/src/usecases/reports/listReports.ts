import type { PrismaClient, ReportStatus } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireModerationScope } from "@/src/domain/policies/moderatorScope";

export async function listReports(
  prisma: PrismaClient,
  actor: Actor,
  input: { boardId: string; status?: ReportStatus },
) {
  requireModerationScope(actor, input.boardId);

  const reports = await prisma.report.findMany({
    where: {
      boardId: input.boardId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      boardId: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      createdAt: true,
      resolvedById: true,
      resolvedAt: true,
      note: true,
    },
  });

  return {
    reports: reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    })),
  };
}
