import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../db/prisma.service';

const planUpsertSchema = z.object({
  name: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly']),
  priceCents: z.number().int().min(0),
  currency: z.string().min(1),
  isActive: z.boolean(),
  limits: z.record(z.string(), z.unknown()),
  features: z.record(z.string(), z.boolean()),
});

@Controller('admin/plans')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminPlansController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const plans = await this.prisma.plan.findMany({ orderBy: { createdAt: 'asc' } });
    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        billingCycle: p.billingCycle,
        priceCents: p.priceCents,
        currency: p.currency,
        isActive: p.isActive,
        limits: (p.limits as any) ?? {},
        features: (p.features as any) ?? {},
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  @Post()
  async create(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = planUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const created = await this.prisma.plan.create({
      data: {
        name: parsed.data.name,
        billingCycle: parsed.data.billingCycle,
        priceCents: parsed.data.priceCents,
        currency: parsed.data.currency,
        isActive: parsed.data.isActive,
        limits: parsed.data.limits as any,
        features: parsed.data.features as any,
      },
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: null,
      action: 'admin.plans.create',
      targetType: 'Plan',
      targetId: created.id,
      payload: parsed.data,
    });

    return {
      id: created.id,
      name: created.name,
      billingCycle: created.billingCycle,
      priceCents: created.priceCents,
      currency: created.currency,
      isActive: created.isActive,
      limits: (created.limits as any) ?? {},
      features: (created.features as any) ?? {},
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  @Put(':planId')
  async update(@Req() req: Request, @Param('planId') planId: string, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = planUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const existing = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Plan not found' });
    }

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        name: parsed.data.name,
        billingCycle: parsed.data.billingCycle,
        priceCents: parsed.data.priceCents,
        currency: parsed.data.currency,
        isActive: parsed.data.isActive,
        limits: parsed.data.limits as any,
        features: parsed.data.features as any,
      },
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: null,
      action: 'admin.plans.update',
      targetType: 'Plan',
      targetId: updated.id,
      payload: { before: existing, after: parsed.data },
    });

    return {
      id: updated.id,
      name: updated.name,
      billingCycle: updated.billingCycle,
      priceCents: updated.priceCents,
      currency: updated.currency,
      isActive: updated.isActive,
      limits: (updated.limits as any) ?? {},
      features: (updated.features as any) ?? {},
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
