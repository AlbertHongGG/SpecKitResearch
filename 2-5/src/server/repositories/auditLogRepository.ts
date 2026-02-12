import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";

function toJsonString(value: unknown): string {
  if (value === undefined) return "{}";
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

export function writeAuditLog(entry: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: any;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return withDbRetry(() =>
    prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: toJsonString(entry.metadata),
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    }),
  );
}

export async function listAuditLogs(params: {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}) {
  // Prisma client argument types may vary by generated client settings; keep this flexible.
  const where: any = {};
  if (params.actorId) where.actorId = params.actorId;
  if (params.targetType) where.targetType = params.targetType;
  if (params.targetId) where.targetId = params.targetId;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }

  const [total, items] = (await withDbRetry(() =>
    prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]),
  )) as [number, Awaited<ReturnType<typeof prisma.auditLog.findMany>>];

  return { total, items };
}
