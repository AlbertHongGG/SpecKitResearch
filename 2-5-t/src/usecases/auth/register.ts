import type { PrismaClient } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";
import { hashPassword } from "@/src/infra/auth/password";
import { createSession } from "@/src/infra/auth/sessionRepo";
import { validateReturnTo } from "@/src/infra/auth/returnTo";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type RegisterInput = {
  email: string;
  password: string;
  returnTo?: string;
};

export async function register(prisma: PrismaClient, input: RegisterInput) {
  await ensureDbReady();

  const email = normalizeEmail(input.email);
  const redirectTo = validateReturnTo(input.returnTo);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(ErrorCodes.Conflict, "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "user",
      isBanned: false,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isBanned: true,
    },
  });

  const session = await createSession(prisma, { userId: user.id });

  return { user, sessionId: session.id, redirectTo };
}
