import { cookies } from "next/headers";
import { z } from "zod";
import { withRoute } from "@/lib/http/route";
import { readJson, jsonResponse } from "@/lib/http/json";
import { zEmail, zPassword } from "@/lib/validation/common";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { authRegister } from "@/server/usecases/authRegister";

export const runtime = "nodejs";

const schema = z.object({
  email: zEmail,
  password: zPassword,
  returnTo: z.string().max(500).optional(),
});

export const POST = withRoute(
  async (req) => {
    const body = await readJson(req, schema);
    const { user, session } = await authRegister({
      email: body.email,
      password: body.password,
      meta: {
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE, session.id, sessionCookieOptions());

    return jsonResponse({ user, returnTo: body.returnTo });
  },
  { auth: "optional", csrf: true },
);
