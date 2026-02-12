import { withRoute } from "@/lib/http/route";
import { jsonResponse, readJson } from "@/lib/http/json";
import { zAdminSetModeratorBody } from "@/lib/validation/admin";
import { adminModeratorsSetAssignment } from "@/server/usecases/adminModerators";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx) => {
    const body = await readJson(req, zAdminSetModeratorBody);
    const res = await adminModeratorsSetAssignment({ req, viewer: ctx.viewer, ...body });
    return jsonResponse(res);
  },
  { auth: "required", csrf: true },
);
