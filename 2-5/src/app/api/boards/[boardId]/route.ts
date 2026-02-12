import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { boardsGet } from "@/server/usecases/boardsGet";

export const runtime = "nodejs";

export const GET = withRoute(async (_req, ctx, next) => {
  const boardId = String(next?.params?.boardId ?? "");
  const { board, permissions } = await boardsGet({ boardId, viewer: ctx.viewer });
  return jsonResponse({ board, permissions });
});
