import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequireOrgRole } from '../../guards/rbac.decorator';
import { PrismaService } from '../db/prisma.service';

const upsertSchema = z.object({
  paymentMethodToken: z.string().min(1),
  setDefault: z.boolean().optional(),
});

@Controller('app/billing/payment-methods')
@UseGuards(AuthGuard, OrgGuard, RbacGuard)
@RequireOrgRole('ORG_ADMIN')
export class PaymentMethodsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
    const ctx = getContext(req);
    const methods = await this.prisma.paymentMethod.findMany({
      where: { organizationId: ctx.org!.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      paymentMethods: methods.map((m) => ({
        id: m.id,
        provider: m.provider,
        isDefault: Boolean(m.isDefault),
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  @Post()
  async upsert(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const setDefault = parsed.data.setDefault ?? true;
    const token = parsed.data.paymentMethodToken;

    await this.prisma.$transaction(async (tx) => {
      if (setDefault) {
        await tx.paymentMethod.updateMany({
          where: { organizationId: ctx.org!.id, isDefault: true },
          data: { isDefault: null },
        });
      }

      // MVP: treat token as an opaque provider reference.
      await tx.paymentMethod.create({
        data: {
          organizationId: ctx.org!.id,
          provider: 'test',
          providerPaymentMethodRef: token,
          isDefault: setDefault ? true : null,
        },
      });
    });

    return this.list(req);
  }
}
