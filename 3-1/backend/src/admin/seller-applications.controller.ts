import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { SellerApplicationsService } from './seller-applications.service';

type AuthedRequest = Request & { user?: AuthUser };

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().optional(),
});

@Controller('admin/seller-applications')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class SellerApplicationsController {
  constructor(private readonly service: SellerApplicationsService) {}

  @Get()
  async list(@Query('status') status?: string) {
    const items = await this.service.list(status);
    return {
      items: items.map((app) => ({
        id: app.id,
        userId: app.userId,
        shopName: app.shopName,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
      })),
    };
  }

  @Post(':applicationId/decision')
  @HttpCode(200)
  async decide(
    @Req() req: AuthedRequest,
    @Param('applicationId') applicationId: string,
    @Body(new ZodValidationPipe(decisionSchema)) body: z.infer<typeof decisionSchema>,
  ) {
    const updated = await this.service.decide({
      adminUserId: req.user!.id,
      applicationId,
      decision: body.decision,
      note: body.note,
    });

    return {
      application: {
        id: updated.id,
        userId: updated.userId,
        shopName: updated.shopName,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }
}
