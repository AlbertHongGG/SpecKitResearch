import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { parsePagination } from "@/lib/http/pagination";
import { postsListByThread } from "@/server/usecases/postsListByThread";

export const runtime = "nodejs";

export const GET = withRoute(async (req, ctx, next) => {
  const threadId = String(next?.params?.threadId ?? "");
  const { page, pageSize } = parsePagination(req.url);
  const { total, items } = await postsListByThread({ threadId, viewer: ctx.viewer, page, pageSize });
  return jsonResponse({ items, pageInfo: { page, pageSize, total } });
});
