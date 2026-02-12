import request from 'supertest';
import { createTestApp } from '../test-app';
import { prismaForTestDb, createUser } from '../test-factories';
import { RefundsService } from '../../src/refunds/refunds.service';
import { PrismaService } from '../../src/shared/db/prisma.service';

describe('Refund reject restores prev status', () => {
  it('seller reject restores prev_suborder_status and writes AuditLog', async () => {
    const app = await createTestApp();
    const prismaService = app.get(PrismaService);
    const refunds = app.get(RefundsService);

    const prisma = prismaForTestDb();
    const buyer = await createUser(prisma, { email: `buyer_${Date.now()}@e.com`, roles: ['buyer'] });
    const seller = await createUser(prisma, { email: `seller_${Date.now()}@e.com`, roles: ['seller'] });

    const order = await prisma.order.create({
      data: { buyerId: buyer.id, totalAmount: 1000, status: 'paid' },
    });
    const sub = await prisma.subOrder.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        subtotal: 1000,
        status: 'refund_requested',
        refundRequestedPrevStatus: 'shipped',
      },
    });

    const rr = await prisma.refundRequest.create({
      data: {
        orderId: order.id,
        subOrderId: sub.id,
        buyerId: buyer.id,
        reason: 'test',
        requestedAmount: 1000,
        approvedAmount: null,
        status: 'requested',
        prevSubOrderStatus: 'shipped',
      },
    });

    await refunds.sellerReject({ sellerId: seller.id, refundId: rr.id, note: 'no' });

    const updatedSub = await prisma.subOrder.findUnique({ where: { id: sub.id } });
    expect(updatedSub?.status).toBe('shipped');

    const updatedRefund = await prisma.refundRequest.findUnique({ where: { id: rr.id } });
    expect(updatedRefund?.status).toBe('rejected');

    const audit = await prisma.auditLog.findFirst({ where: { targetType: 'RefundRequest', targetId: rr.id, action: 'REFUND_REJECT' } });
    expect(audit).toBeTruthy();

    await prisma.$disconnect();
    await prismaService.$disconnect();
    await app.close();
  });
});
