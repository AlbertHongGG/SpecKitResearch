import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.paymentMethod.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async add(organizationId: string, input: { provider: string; providerPaymentMethodRef: string; isDefault?: boolean }) {
    if (input.isDefault) {
      await this.prisma.paymentMethod.updateMany({ where: { organizationId, isDefault: true }, data: { isDefault: false } });
    }

    return this.prisma.paymentMethod.create({
      data: {
        organizationId,
        provider: input.provider,
        providerPaymentMethodRef: input.providerPaymentMethodRef,
        isDefault: Boolean(input.isDefault),
      },
    });
  }

  async setDefault(organizationId: string, id: string) {
    await this.prisma.paymentMethod.updateMany({ where: { organizationId }, data: { isDefault: false } });
    return this.prisma.paymentMethod.update({ where: { id }, data: { isDefault: true } });
  }

  remove(id: string) {
    return this.prisma.paymentMethod.delete({ where: { id } });
  }
}
