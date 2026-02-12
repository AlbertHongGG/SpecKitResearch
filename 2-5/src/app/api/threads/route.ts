import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zCreateThreadBody } from "@/lib/validation/threads";
import { threadsCreate } from "@/server/usecases/threadsCreate";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx) => {
    const body = await readJson(req, zCreateThreadBody);

    const { thread } = await threadsCreate({
      req,
      viewer: ctx.viewer!,
      boardId: body.boardId,
      title: body.title,
      content: body.content,
      intent: body.intent,
    });

    return jsonResponse({ thread });
  },
  { auth: "required", csrf: true },
);
