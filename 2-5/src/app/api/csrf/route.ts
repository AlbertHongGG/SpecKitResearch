import { withRoute } from "@/lib/http/route";
import { issueCsrfToken } from "@/lib/security/csrf";

export const runtime = "nodejs";

export const GET = withRoute(async (_req, ctx) => {
  const token = issueCsrfToken(ctx.viewer?.sessionId ?? null);
  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
});
