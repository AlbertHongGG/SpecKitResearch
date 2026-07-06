import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { toActivityDetailDto, toActivitySummaryDto } from './dto/activity.dto';

@Injectable()
export class PublicActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const items = await this.prisma.activity.findMany({
      where: { status: { in: [ActivityStatus.PUBLISHED, ActivityStatus.FULL] } },
      orderBy: { date: 'asc' },
    });

    return { items: items.map(toActivitySummaryDto) };
  }

  async getPublicDetail(activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Not found');

    if (activity.status !== ActivityStatus.PUBLISHED && activity.status !== ActivityStatus.FULL) {
      throw new NotFoundException('Not found');
    }

    return toActivityDetailDto(activity);
  }
}
