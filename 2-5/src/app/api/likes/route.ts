import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zId } from "@/lib/validation/common";
import { reactionsSetLike } from "@/server/usecases/reactionsSetLike";
import { enforceRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  targetType: z.enum(["thread", "post"]),
  targetId: zId,
  action: z.enum(["like", "unlike"]),
});

export const POST = withRoute(
  async (req, ctx) => {
    enforceRateLimit(req, { name: "like", limit: 120, windowMs: 60_000 });
    const body = await readJson(req, schema);
    const { liked } = await reactionsSetLike({ req, viewer: ctx.viewer!, ...body });
    return jsonResponse({ liked });
  },
  { auth: "required", csrf: true },
);
