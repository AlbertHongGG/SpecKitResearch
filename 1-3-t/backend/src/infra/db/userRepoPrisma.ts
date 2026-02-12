import { prisma } from './prisma';
import type { CreateUserInput, UserRecord, UserRepo } from '../../domain/users/userRepo';

export const userRepoPrisma: UserRepo = {
  async create(input: CreateUserInput): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
};
