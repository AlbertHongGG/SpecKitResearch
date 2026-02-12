import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";

export const runtime = "nodejs";

export const GET = withRoute(
  async (_req, ctx) => {
    return jsonResponse({ user: ctx.viewer!.user, moderatorBoards: ctx.viewer!.moderatorBoards.map((boardId) => ({ boardId })) });
  },
  { auth: "required", csrf: false },
);
