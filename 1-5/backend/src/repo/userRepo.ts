import { Role, type User } from '@prisma/client';
import { prisma } from './prisma.js';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function upsertUser(options: {
  email: string;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  return prisma.user.upsert({
    where: { email: options.email },
    create: {
      email: options.email,
      passwordHash: options.passwordHash,
      role: options.role,
    },
    update: {
      passwordHash: options.passwordHash,
      role: options.role,
    },
  });
}
