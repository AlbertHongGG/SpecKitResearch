import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { threadsSetFeatured } from "@/server/usecases/threadsAdminFlags";

export const runtime = "nodejs";

const schema = z.object({ featured: z.boolean() });

export const POST = withRoute(
  async (req, ctx, next) => {
    const threadId = String(next?.params?.threadId ?? "");
    const body = await readJson(req, schema);
    await threadsSetFeatured({ req, viewer: ctx.viewer!, threadId, featured: body.featured });
    return jsonResponse({ ok: true });
  },
  { auth: "required", csrf: true },
);
