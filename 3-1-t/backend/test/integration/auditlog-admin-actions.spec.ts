import path from 'node:path';

import type { PrismaClient } from '@prisma/client';

import { AuditActions } from '../../src/common/audit/audit-actions';
import { AuditService } from '../../src/common/audit/audit.service';
import { AdminOrdersService } from '../../src/modules/admin/orders/orders.service';
import { AdminRefundsService } from '../../src/modules/admin/refunds/refunds.service';
import {
  createTestPrismaClient,
  disconnectTestPrisma,
  getTestDatabaseUrl,
  runPrismaMigrateAndSeed,
} from '../helpers/test-db';

jest.setTimeout(30000);

describe('admin audit log integration', () => {
  const databaseUrl = getTestDatabaseUrl(
    path.resolve(__dirname, '../.tmp/auditlog-admin-actions.spec.db'),
  );

  let prisma: PrismaClient;
  let refundsService: AdminRefundsService;
  let ordersService: AdminOrdersService;

  beforeEach(async () => {
    runPrismaMigrateAndSeed(databaseUrl);
    prisma = await createTestPrismaClient(databaseUrl);
    const auditService = new AuditService(prisma as any);
    refundsService = new AdminRefundsService(prisma as any, auditService);
    ordersService = new AdminOrdersService(prisma as any, auditService);
  });

  afterEach(async () => {
    if (prisma) {
      await disconnectTestPrisma(prisma);
    }
  });

  it('writes an audit log when admin approves a refund request', async () => {
    await refundsService.approve('seed-refund-request-1', 1200);

    const log = await prisma.auditLog.findFirst({
      where: {
        action: AuditActions.REFUND_REQUEST_DECIDE,
        targetId: 'seed-refund-request-1',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeTruthy();
    expect(log?.actorRole).toBe('ADMIN');
    expect(log?.targetType).toBe('RefundRequest');
    expect(log?.metadata).toContain('approve');
    expect(log?.metadata).toContain('1200');
  });

  it('writes an audit log when admin force cancels an order', async () => {
    await ordersService.forceCancel('seed-order-pending');

    const log = await prisma.auditLog.findFirst({
      where: {
        action: AuditActions.ORDER_FORCE_CANCEL,
        targetId: 'seed-order-pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeTruthy();
    expect(log?.actorRole).toBe('ADMIN');
    expect(log?.targetType).toBe('Order');
    expect(log?.metadata).toContain('CANCELLED');
  });
});
