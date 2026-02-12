import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { RefundsService } from '../refunds/refunds.service';

type AuthedRequest = Request & { user?: AuthUser };

const forceSchema = z.object({ reason: z.string().optional() });

@Controller('admin/refunds')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminRefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post(':refundId/force')
  async force(
    @Req() req: AuthedRequest,
    @Param('refundId') refundId: string,
    @Body(new ZodValidationPipe(forceSchema)) body: z.infer<typeof forceSchema>,
  ) {
    const refund = await this.refunds.adminForceRefund({ adminUserId: req.user!.id, refundId, reason: body.reason });
    return { refund };
  }
}
