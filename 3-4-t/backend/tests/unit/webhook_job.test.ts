import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';
import { hashPassword } from '../../src/domain/auth/password';
import { WebhookJobService } from '../../src/domain/webhook/webhook_job_service';

describe('WebhookJobService', () => {
  let prisma: PrismaClient;
  let orderId: string;

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
    await prisma.paymentMethod.create({
      data: { code: 'card', display_name: 'Card', enabled: true, sort_order: 1 },
    });
    const order = await prisma.order.create({
      data: {
        order_no: 'ord_test_1',
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
  });

  it('claims a due job and reschedules on fail', async () => {
    const svc = new WebhookJobService(prisma);
    const now = new Date('2026-01-01T00:00:00.000Z');
    await svc.enqueue({ orderId, runAt: now, maxAttempts: 2 });

    const claimed = await svc.claimNext({ now, lockTtlSec: 10 });
    expect(claimed).toBeTruthy();
    expect(claimed!.status).toBe('processing');
    expect(claimed!.attempt_count).toBe(1);

    const failed = await svc.fail({ id: claimed!.id, now, error: 'network_error' });
    expect(failed).toBeTruthy();
    expect(failed!.status).toBe('queued');
    expect(failed!.last_error).toBe('network_error');
    expect(new Date(failed!.run_at).getTime()).toBeGreaterThan(now.getTime());

    const claimed2 = await svc.claimNext({ now: new Date(failed!.run_at), lockTtlSec: 10 });
    expect(claimed2).toBeTruthy();
    expect(claimed2!.attempt_count).toBe(2);

    const dead = await svc.fail({ id: claimed2!.id, now: new Date(failed!.run_at), error: 'again' });
    expect(dead).toBeTruthy();
    expect(dead!.status).toBe('dead');
  });
});
