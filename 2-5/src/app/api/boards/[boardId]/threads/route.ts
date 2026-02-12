import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { parsePagination } from "@/lib/http/pagination";
import { threadsListByBoard } from "@/server/usecases/threadsListByBoard";

export const runtime = "nodejs";

export const GET = withRoute(async (req, _ctx, next) => {
  const boardId = String(next?.params?.boardId ?? "");
  const { page, pageSize } = parsePagination(req.url);
  const { total, items } = await threadsListByBoard({ boardId, page, pageSize });
  return jsonResponse({ items, pageInfo: { page, pageSize, total } });
});
