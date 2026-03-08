import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByOrg(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId },
      include: { lineItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: any) {
    return this.prisma.invoice.create({ data });
  }

  getById(id: string) {
    return this.prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } });
  }

  update(id: string, data: any) {
    return this.prisma.invoice.update({ where: { id }, data });
  }
}
