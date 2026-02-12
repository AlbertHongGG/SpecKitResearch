import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { zCreateReportBody } from "@/lib/validation/reports";
import { reportsCreate } from "@/server/usecases/reportsCreate";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx) => {
    enforceRateLimit(req, { name: "report", limit: 30, windowMs: 60_000 });
    const body = await readJson(req, zCreateReportBody);
    const res = await reportsCreate({ req, viewer: ctx.viewer!, ...body });
    return jsonResponse(res);
  },
  { auth: "required", csrf: true },
);
