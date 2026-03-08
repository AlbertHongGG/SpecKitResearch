import { Body, Controller, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { PrismaService } from '../db/prisma.service';
import { WebhookInboxRepo } from '../webhooks/webhook-inbox.repo';
import { WebhookWorkerService } from '../webhooks/webhook-worker.service';

const bodySchema = z.object({
  result: z.enum(['success', 'fail']),
});

@Controller('app/billing/invoices')
@UseGuards(AuthGuard, OrgGuard)
export class PaymentSimController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox: WebhookInboxRepo,
    private readonly worker: WebhookWorkerService,
  ) {}

  @Post(':invoiceId/simulate-payment')
  async simulate(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('invoiceId') invoiceId: string,
    @Body() body: unknown,
  ) {
    const ctx = getContext(req);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const existing = await this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: ctx.org!.id } });
    if (!existing) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Invoice not found' });
    }

    const inboxEvt = await this.inbox.writeInboxEvent({
      provider: 'simulate',
      providerEventId: `simulate:${invoiceId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      payload: { kind: 'payment', orgId: ctx.org!.id, invoiceId, result: parsed.data.result },
    });

    await this.worker.processOne(inboxEvt.id, inboxEvt.payload as any);

    res.status(204);
    return;
  }
}
