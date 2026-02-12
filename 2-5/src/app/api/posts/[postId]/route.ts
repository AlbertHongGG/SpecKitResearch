import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zUpdatePostBody } from "@/lib/validation/posts";
import { postsUpdate } from "@/server/usecases/postsUpdate";

export const runtime = "nodejs";

export const PATCH = withRoute(
  async (req, ctx, next) => {
    const postId = String(next?.params?.postId ?? "");
    const body = await readJson(req, zUpdatePostBody);

    const { post } = await postsUpdate({
      req,
      viewer: ctx.viewer!,
      postId,
      content: body.content,
    });

    return jsonResponse({ post });
  },
  { auth: "required", csrf: true },
);
