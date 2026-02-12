import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

@Injectable()
export class AutoDeliveryJob {
  constructor(private readonly prisma: PrismaService) {}

  async run(params?: { shippedBeforeDays?: number }) {
    const days = params?.shippedBeforeDays ?? 14;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await this.prisma.subOrder.updateMany({
      where: {
        status: 'shipped',
        updatedAt: { lt: cutoff },
      },
      data: { status: 'delivered' },
    });
  }
}
