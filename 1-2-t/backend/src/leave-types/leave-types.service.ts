import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
