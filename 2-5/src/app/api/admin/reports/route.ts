import { ZodError } from "zod";
import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { ApiError } from "@/lib/errors/apiError";
import { zListReportsQuery } from "@/lib/validation/reports";
import { adminReportsList } from "@/server/usecases/adminReportsList";

export const runtime = "nodejs";

export const GET = withRoute(
  async (req, ctx) => {
    const u = new URL(req.url);
    const raw = Object.fromEntries(u.searchParams.entries());

    let q: ReturnType<typeof zListReportsQuery.parse>;
    try {
      q = zListReportsQuery.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) throw ApiError.validation(err.flatten());
      throw err;
    }

    const { total, items } = await adminReportsList({ viewer: ctx.viewer, status: q.status, page: q.page, pageSize: q.pageSize });
    return jsonResponse({ items, pageInfo: { page: q.page, pageSize: q.pageSize, total } });
  },
  { auth: "required" },
);
