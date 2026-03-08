import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';
import { hashPassword } from '../../src/domain/auth/password';
import { ReplayService } from '../../src/domain/replay/replay_service';
import { ReturnLogService } from '../../src/domain/return/return_log_service';

describe('ReplayService', () => {
  let prisma: PrismaClient;
  let orderId: string;
  let userId: string;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    const user = await prisma.user.create({
      data: {
        email: 'dev@example.com',
        password_hash: await hashPassword('password123'),
        role: 'USER_DEVELOPER',
      },
    });
    userId = user.id;

    await prisma.paymentMethod.create({
      data: { code: 'card', display_name: 'Card', enabled: true, sort_order: 1 },
    });
    const order = await prisma.order.create({
      data: {
        order_no: 'ord_replay_1',
        user_id: user.id,
        amount: 100,
        currency: 'TWD',
        status: 'paid',
        callback_url: 'http://localhost/callback',
        return_method: 'query_string',
        webhook_url: 'http://localhost/webhook',
        payment_method_code: 'card',
        simulation_scenario_type: 'success',
        delay_sec: 0,
        webhook_delay_sec: 0,
        completed_at: new Date(),
      },
    });
    orderId = order.id;

    const returnLog = new ReturnLogService(prisma);
    await returnLog.record({
      orderId,
      deliveryMethod: 'query_string',
      callbackUrl: order.callback_url,
      payload: {
        order_no: order.order_no,
        status: 'paid',
        amount: order.amount,
        currency: order.currency,
        completed_at: order.completed_at!.toISOString(),
        error_code: null,
        error_message: null,
      },
      success: true,
    });
  });

  it('replay does not change order status', async () => {
    const svc = new ReplayService(prisma);
    await svc.replay({ requester: { id: userId, role: 'USER_DEVELOPER' }, orderId, scope: 'full_flow' });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('paid');

    const runs = await prisma.replayRun.findMany({ where: { order_id: orderId } });
    expect(runs.length).toBeGreaterThan(0);
  });
});
