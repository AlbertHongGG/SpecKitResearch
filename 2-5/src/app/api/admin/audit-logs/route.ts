import { ZodError } from "zod";
import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { ApiError } from "@/lib/errors/apiError";
import { zAdminAuditLogsQuery } from "@/lib/validation/admin";
import { adminAuditLogsList } from "@/server/usecases/adminAuditLogsList";

export const runtime = "nodejs";

export const GET = withRoute(
  async (req, ctx) => {
    const u = new URL(req.url);
    const raw = Object.fromEntries(u.searchParams.entries());

    let q: ReturnType<typeof zAdminAuditLogsQuery.parse>;
    try {
      q = zAdminAuditLogsQuery.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) throw ApiError.validation(err.flatten());
      throw err;
    }

    const { total, items } = await adminAuditLogsList({ viewer: ctx.viewer, ...q });
    return jsonResponse({ items, pageInfo: { page: q.page, pageSize: q.pageSize, total } });
  },
  { auth: "required" },
);
