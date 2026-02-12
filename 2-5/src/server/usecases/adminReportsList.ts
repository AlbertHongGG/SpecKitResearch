import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import type { Viewer } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/rbac/guards";

export async function adminReportsList(params: {
  viewer: Viewer | null;
  status?: "pending" | "accepted" | "rejected";
  page: number;
  pageSize: number;
}) {
  requireAdmin(params.viewer);

  const where: any = {};
  if (params.status) where.status = params.status;

  const [total, items] = (await withDbRetry(() =>
    prisma.$transaction([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]),
  )) as [number, Awaited<ReturnType<typeof prisma.report.findMany>>];

  return { total, items };
}
