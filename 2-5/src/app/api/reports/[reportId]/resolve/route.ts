import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zResolveReportBody } from "@/lib/validation/reports";
import { reportsResolve } from "@/server/usecases/reportsResolve";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx, next) => {
    const reportId = String(next?.params?.reportId ?? "");
    const body = await readJson(req, zResolveReportBody);
    const res = await reportsResolve({ req, viewer: ctx.viewer!, reportId, ...body });
    return jsonResponse(res);
  },
  { auth: "required", csrf: true },
);
