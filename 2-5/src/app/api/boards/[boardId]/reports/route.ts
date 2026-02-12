import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { parsePagination } from "@/lib/http/pagination";
import { reportsListByBoard } from "@/server/usecases/reportsListByBoard";

export const runtime = "nodejs";

const zStatus = z.enum(["pending", "accepted", "rejected"]).optional();

export const GET = withRoute(
  async (req, ctx, next) => {
    const boardId = String(next?.params?.boardId ?? "");
    const { page, pageSize } = parsePagination(req.url);

    const u = new URL(req.url);
    const statusRaw = u.searchParams.get("status") ?? undefined;
    const status = zStatus.parse(statusRaw);

    const { total, items } = await reportsListByBoard({ boardId, viewer: ctx.viewer!, status, page, pageSize });
    return jsonResponse({ items, pageInfo: { page, pageSize, total } });
  },
  { auth: "required", csrf: false },
);
