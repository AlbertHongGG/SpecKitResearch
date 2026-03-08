import { getPrisma } from '../lib/db.js';

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
};

export async function findUserByEmail(email: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserById(id: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(input: CreateUserInput) {
  const prisma = getPrisma();
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });
}
