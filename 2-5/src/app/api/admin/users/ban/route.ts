import { withRoute } from "@/lib/http/route";
import { jsonResponse, readJson } from "@/lib/http/json";
import { zAdminSetBanBody } from "@/lib/validation/admin";
import { adminUsersSetBanStatus } from "@/server/usecases/adminUsers";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx) => {
    const body = await readJson(req, zAdminSetBanBody);
    const res = await adminUsersSetBanStatus({ req, viewer: ctx.viewer, ...body });
    return jsonResponse(res);
  },
  { auth: "required", csrf: true },
);
