import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
import { ErrorCodes, makeError } from '@app/contracts';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async setActive(params: { userId: string; isActive: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '使用者不存在'));
    return this.prisma.user.update({ where: { id: user.id }, data: { isActive: params.isActive } });
  }

  async setRole(params: { userId: string; role: UserRole }) {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, '使用者不存在'));
    return this.prisma.user.update({ where: { id: user.id }, data: { role: params.role } });
  }
}
