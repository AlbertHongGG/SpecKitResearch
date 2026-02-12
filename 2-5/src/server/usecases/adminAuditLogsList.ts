import type { Viewer } from "@/lib/auth/session";
import { ApiError } from "@/lib/errors/apiError";
import { requireAdmin } from "@/lib/rbac/guards";
import { listAuditLogs } from "@/server/repositories/auditLogRepository";

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.validation({ date: value }, "日期格式錯誤");
  return d;
}

export async function adminAuditLogsList(params: {
  viewer: Viewer | null;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  requireAdmin(params.viewer);

  const from = parseOptionalDate(params.from);
  const to = parseOptionalDate(params.to);

  return listAuditLogs({
    actorId: params.actorId,
    targetType: params.targetType,
    targetId: params.targetId,
    from,
    to,
    page: params.page,
    pageSize: params.pageSize,
  });
}
