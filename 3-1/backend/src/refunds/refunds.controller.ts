import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { RefundsService } from './refunds.service';

type AuthedRequest = Request & { user?: AuthUser };

const createSchema = z.object({
  suborderId: z.string().min(1),
  reason: z.string().min(1),
  requestedAmount: z.number().int().min(0),
});

@Controller('refunds')
@UseGuards(AuthGuard)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    const refund = await this.refunds.createRefundRequest({
      buyerId: req.user!.id,
      subOrderId: body.suborderId,
      reason: body.reason,
      requestedAmount: body.requestedAmount,
    });
    return { refund };
  }
}
