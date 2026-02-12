import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zUpdateThreadBody } from "@/lib/validation/threads";
import { threadsGet } from "@/server/usecases/threadsGet";
import { threadsUpdate } from "@/server/usecases/threadsUpdate";

export const runtime = "nodejs";

export const GET = withRoute(async (_req, ctx, next) => {
  const threadId = String(next?.params?.threadId ?? "");
  const { board, thread, viewer, reactions } = await threadsGet({ threadId, viewer: ctx.viewer });
  return jsonResponse({ board, thread, viewer, reactions });
});

export const PATCH = withRoute(
  async (req, ctx, next) => {
    const threadId = String(next?.params?.threadId ?? "");
    const body = await readJson(req, zUpdateThreadBody);

    const { thread } = await threadsUpdate({
      req,
      viewer: ctx.viewer!,
      threadId,
      patch: body,
    });

    return jsonResponse({ thread });
  },
  { auth: "required", csrf: true },
);
