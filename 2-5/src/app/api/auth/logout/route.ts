import { cookies } from "next/headers";
import { withRoute } from "@/lib/http/route";
import { jsonResponse } from "@/lib/http/json";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { authLogout } from "@/server/usecases/authLogout";

export const runtime = "nodejs";

export const POST = withRoute(
  async (_req, ctx) => {
    await authLogout({ sessionId: ctx.viewer!.sessionId });

    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });

    return jsonResponse({ ok: true });
  },
  { auth: "required", csrf: true },
);
