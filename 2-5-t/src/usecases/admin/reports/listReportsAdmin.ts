import type { PrismaClient, ReportStatus } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";

export async function listReportsAdmin(
  prisma: PrismaClient,
  actor: Actor,
  input: { status?: ReportStatus; boardId?: string; page: number; pageSize: number },
) {
  requireAdmin(actor);

  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));

  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.boardId ? { boardId: input.boardId } : {}),
  } as any;

  const [total, reports] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        boardId: true,
        reporterId: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        resolvedById: true,
        resolvedAt: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    reports: reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    })),
    pageInfo: { page, pageSize, total },
  };
}
