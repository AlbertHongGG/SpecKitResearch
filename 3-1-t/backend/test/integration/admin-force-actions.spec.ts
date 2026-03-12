import path from 'node:path';

import type { PrismaClient } from '@prisma/client';

import { AuditService } from '../../src/common/audit/audit.service';
import { AdminOrdersService } from '../../src/modules/admin/orders/orders.service';
import {
  createTestPrismaClient,
  disconnectTestPrisma,
  getTestDatabaseUrl,
  runPrismaMigrateAndSeed,
} from '../helpers/test-db';

jest.setTimeout(30000);

describe('admin force actions integration', () => {
  const databaseUrl = getTestDatabaseUrl(
    path.resolve(__dirname, '../.tmp/admin-force-actions.spec.db'),
  );

  let prisma: PrismaClient;
  let service: AdminOrdersService;

  beforeEach(async () => {
    runPrismaMigrateAndSeed(databaseUrl);
    prisma = await createTestPrismaClient(databaseUrl);
    const auditService = new AuditService(prisma as any);
    service = new AdminOrdersService(prisma as any, auditService);
  });

  afterEach(async () => {
    if (prisma) {
      await disconnectTestPrisma(prisma);
    }
  });

  it('force cancel updates order and all suborders to cancelled', async () => {
    const result = await service.forceCancel('seed-order-pending');

    expect(result).toBeTruthy();
    expect(result?.status).toBe('CANCELLED');
    expect(
      result?.subOrders.every((subOrder) => subOrder.status === 'CANCELLED'),
    ).toBe(true);
  });

  it('force refund keeps aggregate status aligned with refunded suborders', async () => {
    const result = await service.forceRefund('seed-order-paid');

    expect(result).toBeTruthy();
    expect(result?.status).toBe('REFUNDED');
    expect(
      result?.subOrders.every((subOrder) => subOrder.status === 'REFUNDED'),
    ).toBe(true);
    expect(result?.payments[0]?.status).toBe('SUCCEEDED');
  });
});
