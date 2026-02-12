import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zId } from "@/lib/validation/common";
import { reactionsSetFavorite } from "@/server/usecases/reactionsSetFavorite";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  threadId: zId,
  action: z.enum(["favorite", "unfavorite"]),
});

export const POST = withRoute(
  async (req, ctx) => {
    enforceRateLimit(req, { name: "favorite", limit: 120, windowMs: 60_000 });
    const body = await readJson(req, schema);
    const { favorited } = await reactionsSetFavorite({ req, viewer: ctx.viewer!, ...body });
    return jsonResponse({ favorited });
  },
  { auth: "required", csrf: true },
);
