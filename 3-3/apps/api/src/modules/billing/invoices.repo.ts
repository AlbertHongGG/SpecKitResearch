import { Injectable } from '@nestjs/common';
import type { InvoiceKind, InvoiceStatus } from '@sb/db';
import { PrismaService } from '../db/prisma.service';
import { assertOccUpdated } from '../../common/db/occ';

@Injectable()
export class InvoicesRepo {
  constructor(private readonly prisma: PrismaService) {}

  async listForOrg(orgId: string, input?: { status?: InvoiceStatus }) {
    return this.prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        ...(input?.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForOrg(orgId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { lineItems: true },
    });
  }

  async createInvoice(input: {
    organizationId: string;
    subscriptionId: string;
    kind: InvoiceKind;
    status: InvoiceStatus;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    currency: string;
    totalCents: number;
    lineItems: Array<{ type: 'RECURRING' | 'PRORATION' | 'OVERAGE' | 'TAX'; description: string; amountCents: number }>;
  }) {
    return this.prisma.invoice.create({
      data: {
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId,
        kind: input.kind,
        status: input.status,
        billingPeriodStart: input.billingPeriodStart,
        billingPeriodEnd: input.billingPeriodEnd,
        currency: input.currency,
        totalCents: input.totalCents,
        lineItems: {
          create: input.lineItems.map((li) => ({
            type: li.type,
            description: li.description,
            amountCents: li.amountCents,
          })),
        },
      },
    });
  }

  async updateWithOcc(invoiceId: string, version: number, data: Parameters<PrismaService['invoice']['update']>[0]['data']) {
    const result = await this.prisma.invoice.updateMany({
      where: { id: invoiceId, version },
      data: { ...data, version: { increment: 1 } },
    });
    assertOccUpdated(result);
  }
}
