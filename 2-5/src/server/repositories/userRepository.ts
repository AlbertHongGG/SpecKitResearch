import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";

export function findUserByEmail(email: string) {
  return withDbRetry(() => prisma.user.findUnique({ where: { email } }));
}

export function findUserById(id: string) {
  return withDbRetry(() => prisma.user.findUnique({ where: { id } }));
}

export function createUser(data: { email: string; passwordHash: string }) {
  return withDbRetry(() =>
    prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: "user",
        isBanned: false,
      },
    }),
  );
}

export function setUserBanStatus(userId: string, isBanned: boolean) {
  return withDbRetry(() => prisma.user.update({ where: { id: userId }, data: { isBanned } }));
}
