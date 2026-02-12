import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { RefundsService } from '../refunds/refunds.service';

type AuthedRequest = Request & { user?: AuthUser };

const approveSchema = z.object({
  approvedAmount: z.number().int().min(0).optional(),
});
const rejectSchema = z.object({ note: z.string().optional() });

@Controller('seller/refunds')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller')
export class SellerRefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get()
  async list(@Req() req: AuthedRequest, @Query('status') status?: string) {
    const items = await this.refunds.listForSeller({ sellerId: req.user!.id, status });
    return { items };
  }

  @Post(':refundId/approve')
  async approve(
    @Req() req: AuthedRequest,
    @Param('refundId') refundId: string,
    @Body(new ZodValidationPipe(approveSchema)) body: z.infer<typeof approveSchema>,
  ) {
    const refund = await this.refunds.sellerApprove({ sellerId: req.user!.id, refundId, approvedAmount: body.approvedAmount });
    return { refund };
  }

  @Post(':refundId/reject')
  async reject(
    @Req() req: AuthedRequest,
    @Param('refundId') refundId: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: z.infer<typeof rejectSchema>,
  ) {
    const refund = await this.refunds.sellerReject({ sellerId: req.user!.id, refundId, note: body.note });
    return { refund };
  }
}
