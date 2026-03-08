import type { PrismaClient } from '@prisma/client';

export type PaymentMethodUpsertInput = {
  code: string;
  display_name: string;
  enabled: boolean;
  sort_order: number;
};

export class PaymentMethodService {
  constructor(private prisma: PrismaClient) {}

  async list() {
    return this.prisma.paymentMethod.findMany({
      orderBy: [{ sort_order: 'asc' }, { code: 'asc' }],
    });
  }

  async upsert(input: PaymentMethodUpsertInput) {
    return this.prisma.paymentMethod.upsert({
      where: { code: input.code },
      update: {
        display_name: input.display_name,
        enabled: input.enabled,
        sort_order: input.sort_order,
      },
      create: {
        code: input.code,
        display_name: input.display_name,
        enabled: input.enabled,
        sort_order: input.sort_order,
      },
    });
  }
}
