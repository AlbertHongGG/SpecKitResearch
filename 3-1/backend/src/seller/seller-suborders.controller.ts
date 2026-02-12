import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/types';
import { PrismaService } from '../shared/db/prisma.service';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { FulfillmentService } from './fulfillment.service';
import { ErrorCodes } from '../shared/http/error-codes';

type AuthedRequest = Request & { user?: AuthUser };

const shipSchema = z
  .object({
    carrier: z.string().optional(),
    trackingNo: z.string().optional(),
  })
  .optional();

@Controller('seller/suborders')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller')
export class SellerSubOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillment: FulfillmentService,
  ) {}

  @Get()
  async list(@Req() req: AuthedRequest, @Query('status') status?: string) {
    const items = await this.prisma.subOrder.findMany({
      where: {
        sellerId: req.user!.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  }

  @Get(':suborderId')
  async detail(@Req() req: AuthedRequest, @Param('suborderId') suborderId: string) {
    const suborder = await this.prisma.subOrder.findFirst({
      where: { id: suborderId, sellerId: req.user!.id },
      include: { items: true },
    });
    if (!suborder) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'SubOrder not found' });
    return { suborder };
  }

  @Post(':suborderId/ship')
  async ship(
    @Req() req: AuthedRequest,
    @Param('suborderId') suborderId: string,
    @Body(new ZodValidationPipe(shipSchema)) body?: z.infer<typeof shipSchema>,
  ) {
    const suborder = await this.fulfillment.ship(req.user!.id, suborderId, body ?? undefined);
    return { suborder };
  }
}
