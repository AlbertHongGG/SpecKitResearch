import { NextResponse } from "next/server";
import { mintCsrfToken } from "@/src/infra/auth/csrf";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/src/lib/http/cookieNames";
import { route } from "@/src/lib/http/route";

export const GET = route(
  async (req) => {
    const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const token = mintCsrfToken(sessionId);

    const res = NextResponse.json({ token });
    res.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  },
  { csrf: "none" },
);
