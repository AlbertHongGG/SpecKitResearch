import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { SESSION_COOKIE_NAME } from "@/src/infra/auth/sessionRepo";
import { validateJson } from "@/src/lib/http/validate";
import { route } from "@/src/lib/http/route";
import { register } from "@/src/usecases/auth/register";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  returnTo: z.string().optional(),
});

export const POST = route(async (req) => {
  const body = await validateJson(req, schema);
  const result = await register(prisma, body);

  const res = NextResponse.json({
    authenticated: true,
    user: result.user,
    redirectTo: result.redirectTo,
  });

  res.cookies.set(SESSION_COOKIE_NAME, result.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
});
