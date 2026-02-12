import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const [users, purchases] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.purchase.count(),
    ]);

    const byStatusEntries = await Promise.all(
      Object.values(CourseStatus).map(async (status) => ({
        status,
        count: await this.prisma.course.count({ where: { status } }),
      })),
    );

    return {
      users,
      purchases,
      coursesByStatus: Object.fromEntries(byStatusEntries.map((e) => [e.status, e.count])),
    };
  }
}
