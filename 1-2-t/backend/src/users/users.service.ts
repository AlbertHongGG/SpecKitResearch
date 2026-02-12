import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new NotFoundException({
        code: 'not_found',
        message: 'User not found',
      });
    return user;
  }

  async isDirectManagerOf(
    managerId: string,
    employeeId: string,
  ): Promise<boolean> {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });
    return employee?.managerId === managerId;
  }
}
