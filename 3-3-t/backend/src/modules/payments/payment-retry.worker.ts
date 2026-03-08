import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentRetryWorker {
  constructor(private readonly prisma: PrismaService) {}

  async listFailedInvoices() {
    return this.prisma.invoice.findMany({ where: { status: 'Failed' }, orderBy: { failedAt: 'desc' } });
  }
}
