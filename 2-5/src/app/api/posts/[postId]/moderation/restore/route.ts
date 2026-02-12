import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { postsRestore } from "@/server/usecases/postsModeration";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx, next) => {
    const postId = String(next?.params?.postId ?? "");
    await postsRestore({ req, viewer: ctx.viewer!, postId });
    return jsonResponse({ ok: true });
  },
  { auth: "required", csrf: true },
);
