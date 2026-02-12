import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { PrismaService } from '../shared/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

type AuthedRequest = Request & { user?: AuthUser };

const createSchema = z.object({
  orderId: z.string().min(1),
  subOrderId: z.string().min(1).optional(),
  openedBy: z.enum(['buyer', 'seller', 'admin']).default('admin'),
});

const resolveSchema = z.object({
  resolutionNote: z.string().min(1),
});

@Controller('admin/disputes')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class DisputesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query('status') status?: string) {
    const items = await this.prisma.disputeCase.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items };
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const dispute = await this.prisma.disputeCase.create({
      data: {
        orderId: body.orderId,
        subOrderId: body.subOrderId ?? null,
        openedBy: body.openedBy,
        status: 'open',
      },
    });

    await this.audit.write({
      actorUserId: req.user!.id,
      actorRole: 'admin',
      action: AuditActions.DISPUTE_CREATE,
      targetType: 'DisputeCase',
      targetId: dispute.id,
    });

    return { dispute };
  }

  @Post(':disputeId/resolve')
  async resolve(
    @Req() req: AuthedRequest,
    @Param('disputeId') disputeId: string,
    @Body(new ZodValidationPipe(resolveSchema)) body: z.infer<typeof resolveSchema>,
  ) {
    const dispute = await this.prisma.disputeCase.update({
      where: { id: disputeId },
      data: { status: 'resolved', resolutionNote: body.resolutionNote },
    });

    await this.audit.write({
      actorUserId: req.user!.id,
      actorRole: 'admin',
      action: AuditActions.DISPUTE_RESOLVE,
      targetType: 'DisputeCase',
      targetId: disputeId,
      metadata: { resolutionNote: body.resolutionNote },
    });

    return { dispute };
  }
}
