import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { threadsSetPinned } from "@/server/usecases/threadsAdminFlags";

export const runtime = "nodejs";

const schema = z.object({ pinned: z.boolean() });

export const POST = withRoute(
  async (req, ctx, next) => {
    const threadId = String(next?.params?.threadId ?? "");
    const body = await readJson(req, schema);
    await threadsSetPinned({ req, viewer: ctx.viewer!, threadId, pinned: body.pinned });
    return jsonResponse({ ok: true });
  },
  { auth: "required", csrf: true },
);
