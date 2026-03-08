import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { InvoicesRepo } from './invoices.repo';

const querySchema = z.object({
  status: z.enum(['Draft', 'Open', 'Paid', 'Failed', 'Voided']).optional(),
});

@Controller('app/billing')
@UseGuards(AuthGuard, OrgGuard)
export class BillingController {
  constructor(private readonly invoices: InvoicesRepo) {}

  @Get('invoices')
  async list(@Req() req: Request, @Query() query: unknown) {
    const ctx = getContext(req);
    const parsed = querySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const rows = await this.invoices.listForOrg(ctx.org!.id, { status: parsed.data.status });
    return {
      invoices: rows.map((i) => ({
        id: i.id,
        status: i.status,
        billingPeriod: { start: i.billingPeriodStart.toISOString(), end: i.billingPeriodEnd.toISOString() },
        totalCents: i.totalCents,
        currency: i.currency,
        dueAt: i.dueAt?.toISOString() ?? null,
        paidAt: i.paidAt?.toISOString() ?? null,
        failedAt: i.failedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }

  @Get('invoices/:invoiceId')
  async detail(@Req() req: Request, @Param('invoiceId') invoiceId: string) {
    const ctx = getContext(req);
    const row = await this.invoices.getForOrg(ctx.org!.id, invoiceId);
    if (!row) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Invoice not found' });
    }

    return {
      invoice: {
        id: row.id,
        status: row.status,
        billingPeriod: { start: row.billingPeriodStart.toISOString(), end: row.billingPeriodEnd.toISOString() },
        totalCents: row.totalCents,
        currency: row.currency,
        dueAt: row.dueAt?.toISOString() ?? null,
        paidAt: row.paidAt?.toISOString() ?? null,
        failedAt: row.failedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      },
      lineItems: row.lineItems.map((li) => ({
        type: li.type,
        description: li.description,
        amountCents: li.amountCents,
        quantity: li.quantity ?? null,
        meterCode: li.meterCode ?? null,
      })),
    };
  }
}
