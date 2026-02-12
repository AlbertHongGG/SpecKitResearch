import { ZodError } from "zod";
import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { ApiError } from "@/lib/errors/apiError";
import { zAdminCreateBoardBody, zAdminReorderBoardsBody, zAdminUpdateBoardBody } from "@/lib/validation/admin";
import { adminBoardsCreate, adminBoardsList, adminBoardsReorder, adminBoardsUpdate } from "@/server/usecases/adminBoards";

export const runtime = "nodejs";

export const GET = withRoute(
  async (_req, ctx) => {
    const boards = await adminBoardsList(ctx.viewer);
    return jsonResponse({ boards });
  },
  { auth: "required" },
);

export const POST = withRoute(
  async (req, ctx) => {
    const body = await (async () => {
      try {
        return zAdminCreateBoardBody.parse(await req.json());
      } catch (err) {
        if (err instanceof ZodError) throw ApiError.validation(err.flatten());
        throw ApiError.validation(undefined, "JSON 解析失敗");
      }
    })();

    const { board } = await adminBoardsCreate({ req, viewer: ctx.viewer, ...body });
    return jsonResponse({ board });
  },
  { auth: "required", csrf: true },
);

export const PATCH = withRoute(
  async (req, ctx) => {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      throw ApiError.validation(undefined, "JSON 解析失敗");
    }

    if (typeof json === "object" && json && "reorder" in json) {
      try {
        const body = zAdminReorderBoardsBody.parse(json);
        const { boards } = await adminBoardsReorder({ req, viewer: ctx.viewer, reorder: body.reorder });
        return jsonResponse({ boards });
      } catch (err) {
        if (err instanceof ZodError) throw ApiError.validation(err.flatten());
        throw err;
      }
    }

    try {
      const body = zAdminUpdateBoardBody.parse(json);
      const { board } = await adminBoardsUpdate({ req, viewer: ctx.viewer, ...body });
      return jsonResponse({ board });
    } catch (err) {
      if (err instanceof ZodError) throw ApiError.validation(err.flatten());
      throw err;
    }
  },
  { auth: "required", csrf: true },
);
