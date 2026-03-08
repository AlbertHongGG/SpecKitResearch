import { Injectable } from '@nestjs/common';
import type { Prisma } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

type PrismaOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class UsersRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string, client: PrismaOrTx = this.prisma) {
    return client.user.findUnique({ where: { email } });
  }

  async findById(id: string, client: PrismaOrTx = this.prisma) {
    return client.user.findUnique({ where: { id } });
  }

  async createUser(
    input: { email: string; passwordHash: string; isPlatformAdmin?: boolean },
    client: PrismaOrTx = this.prisma,
  ) {
    return client.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        isPlatformAdmin: input.isPlatformAdmin ?? false,
      },
    });
  }

  async touchLastLogin(userId: string, client: PrismaOrTx = this.prisma) {
    await client.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }
}
