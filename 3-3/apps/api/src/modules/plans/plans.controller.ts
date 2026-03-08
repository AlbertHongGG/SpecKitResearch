import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { PlansService } from './plans.service';

const querySchema = z.object({
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
});

@Controller('pricing')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get('plans')
  async list(@Query() query: unknown) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const plans = await this.plans.listPublicPlans({
      billingCycle: parsed.data.billingCycle,
    });

    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        billingCycle: p.billingCycle,
        priceCents: p.priceCents,
        currency: p.currency,
        isActive: p.isActive,
        limits: p.limits,
        features: p.features,
      })),
    };
  }
}
