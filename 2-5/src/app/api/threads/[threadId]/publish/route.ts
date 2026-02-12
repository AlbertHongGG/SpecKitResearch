import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { threadsPublish } from "@/server/usecases/threadsPublish";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx, next) => {
    const threadId = String(next?.params?.threadId ?? "");
    const { thread } = await threadsPublish({ req, viewer: ctx.viewer!, threadId });
    return jsonResponse({ thread });
  },
  { auth: "required", csrf: true },
);
