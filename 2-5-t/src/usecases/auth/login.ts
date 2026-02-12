import type { PrismaClient } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";
import { verifyPassword } from "@/src/infra/auth/password";
import { createSession } from "@/src/infra/auth/sessionRepo";
import { validateReturnTo } from "@/src/infra/auth/returnTo";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type LoginInput = {
  email: string;
  password: string;
  returnTo?: string;
};

export async function login(prisma: PrismaClient, input: LoginInput) {
  await ensureDbReady();

  const email = normalizeEmail(input.email);
  const redirectTo = validateReturnTo(input.returnTo);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isBanned: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(ErrorCodes.Unauthenticated, "Invalid credentials");
  }

  if (user.isBanned) {
    throw new AppError(ErrorCodes.Forbidden, "User is banned");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError(ErrorCodes.Unauthenticated, "Invalid credentials");
  }

  const session = await createSession(prisma, { userId: user.id });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
    },
    sessionId: session.id,
    redirectTo,
  };
}
