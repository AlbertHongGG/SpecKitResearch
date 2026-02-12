import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { threadsLock } from "@/server/usecases/threadsAdminFlags";

export const runtime = "nodejs";

export const POST = withRoute(
  async (req, ctx, next) => {
    const threadId = String(next?.params?.threadId ?? "");
    await threadsLock({ req, viewer: ctx.viewer!, threadId });
    return jsonResponse({ ok: true });
  },
  { auth: "required", csrf: true },
);
