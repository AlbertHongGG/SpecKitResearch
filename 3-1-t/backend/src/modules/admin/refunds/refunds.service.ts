import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminRefundsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.refundRequest.findMany({
      include: { subOrder: true, buyer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  approve(id: string) {
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  reject(id: string) {
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  forceRefund(id: string) {
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });
  }
}
