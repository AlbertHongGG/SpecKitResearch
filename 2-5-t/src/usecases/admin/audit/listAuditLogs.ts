import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";

export async function listAuditLogs(
  prisma: PrismaClient,
  actor: Actor,
  input: { page: number; pageSize: number; targetType?: string; targetId?: string },
) {
  requireAdmin(actor);

  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));

  const where = {
    ...(input.targetType ? { targetType: input.targetType } : {}),
    ...(input.targetId ? { targetId: input.targetId } : {}),
  } as any;

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    items: items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    pageInfo: { page, pageSize, total },
  };
}
