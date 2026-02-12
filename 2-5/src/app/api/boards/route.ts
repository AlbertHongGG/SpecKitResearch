import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { listBoards } from "@/server/repositories/boardRepository";

export const runtime = "nodejs";

export const GET = withRoute(async () => {
  const boards = await listBoards();
  return jsonResponse({ boards });
});
