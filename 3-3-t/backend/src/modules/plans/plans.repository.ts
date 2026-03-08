import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ name: 'asc' }, { billingCycle: 'asc' }],
    });
  }

  getById(id: string) {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  create(input: {
    name: string;
    billingCycle: string;
    priceCents: number;
    currency: string;
    limits: Record<string, unknown>;
    features: Record<string, boolean>;
  }) {
    return this.prisma.plan.create({
      data: {
        ...input,
        limits: JSON.stringify(input.limits),
        features: JSON.stringify(input.features),
      },
    });
  }

  update(id: string, data: Partial<{ isActive: boolean; priceCents: number; limits: string; features: string }>) {
    return this.prisma.plan.update({ where: { id }, data });
  }
}
