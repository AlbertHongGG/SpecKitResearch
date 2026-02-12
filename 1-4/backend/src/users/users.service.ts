import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    role: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        email: normalizeEmail(params.email),
        passwordHash: params.passwordHash,
        role: params.role,
      },
    });
  }

  async setRole(params: { userId: string; role: UserRole }) {
    return this.prisma.user.update({
      where: { id: params.userId },
      data: { role: params.role },
    });
  }

  async setActive(params: { userId: string; isActive: boolean }) {
    return this.prisma.user.update({
      where: { id: params.userId },
      data: { isActive: params.isActive },
    });
  }

  async bumpTokenVersion(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}
