import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zCreatePostBody } from "@/lib/validation/posts";
import { postsCreate } from "@/server/usecases/postsCreate";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx) => {
    const body = await readJson(req, zCreatePostBody);

    const { post } = await postsCreate({
      req,
      viewer: ctx.viewer!,
      threadId: body.threadId,
      content: body.content,
    });

    return jsonResponse({ post });
  },
  { auth: "required", csrf: true },
);
