import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { SESSION_COOKIE_NAME } from "@/src/infra/auth/sessionRepo";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { route } from "@/src/lib/http/route";
import { logout } from "@/src/usecases/auth/logout";

export const POST = route(async (req) => {
  const sessionId = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    throw new AppError(ErrorCodes.Unauthenticated, "Not logged in");
  }

  await logout(prisma, sessionId);

  const res = NextResponse.json({ authenticated: false, redirectTo: "/" });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
});
