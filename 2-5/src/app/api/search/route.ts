import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { parsePagination } from "@/lib/http/pagination";
import { searchPublic } from "@/server/usecases/searchPublic";

export const runtime = "nodejs";

export const GET = withRoute(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const { page, pageSize } = parsePagination(req.url);
  const { total, items } = await searchPublic({ q, page, pageSize });
  return jsonResponse({ items, pageInfo: { page, pageSize, total } });
});
