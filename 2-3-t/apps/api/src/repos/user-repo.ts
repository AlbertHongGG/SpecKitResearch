import type { PrismaClient } from '@prisma/client';

export async function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function findUserById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function createUser(prisma: PrismaClient, input: { email: string; passwordHash: string; displayName: string }) {
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    },
  });
}
