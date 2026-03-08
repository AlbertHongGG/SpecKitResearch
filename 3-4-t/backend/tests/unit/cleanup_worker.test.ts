import { PrismaClient } from '@prisma/client';
import { describe, expect, test } from 'vitest';
import { runCleanupWorkerOnce } from '../../src/worker/cleanup_worker';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('cleanup worker', () => {
  test('cleans old sessions, deletes old jobs, and requeues stuck processing jobs', async () => {
    const { url } = createTestDatabaseUrl();
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });
    const prisma = new PrismaClient({ datasources: { db: { url } } });

    const now = new Date('2026-03-04T00:00:00.000Z');
    const old = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const recentExpired = new Date(now.getTime() - 60 * 60 * 1000);
    const veryOldJob = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const recentJob = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: 'dev@example.com',
        password_hash: 'hash',
        role: 'USER_DEVELOPER',
      },
    });

    await prisma.session.create({
      data: {
        sid: 'expired-old',
        user_id: user.id,
        created_at: old,
        last_seen_at: old,
        expires_at: old,
      },
    });
    await prisma.session.create({
      data: {
        sid: 'revoked-old',
        user_id: user.id,
        created_at: old,
        last_seen_at: old,
        expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        revoked_at: old,
      },
    });
    await prisma.session.create({
      data: {
        sid: 'expired-recent',
        user_id: user.id,
        created_at: recentExpired,
        last_seen_at: recentExpired,
        expires_at: recentExpired,
      },
    });
    await prisma.session.create({
      data: {
        sid: 'active',
        user_id: user.id,
        created_at: now,
        last_seen_at: now,
        expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      },
    });

    await prisma.paymentMethod.create({
      data: {
        code: 'card',
        display_name: 'Card',
        enabled: true,
      },
    });
    const order = await prisma.order.create({
      data: {
        order_no: 'ORD-TEST-1',
        user_id: user.id,
        amount: 100,
        currency: 'TWD',
        status: 'paid',
        callback_url: 'https://example.com/callback',
        return_method: 'query_string',
        webhook_url: 'https://example.com/webhook',
        payment_method_code: 'card',
        simulation_scenario_type: 'success',
        delay_sec: 0,
        webhook_delay_sec: 0,
        completed_at: now,
      },
    });

    const stuck = await prisma.webhookJob.create({
      data: {
        order_id: order.id,
        run_at: old,
        status: 'processing',
        attempt_count: 1,
        max_attempts: 8,
        lock_expires_at: new Date(now.getTime() - 1000),
      },
    });

    await prisma.webhookJob.create({
      data: {
        order_id: order.id,
        run_at: old,
        status: 'succeeded',
        updated_at: veryOldJob,
      },
    });
    await prisma.webhookJob.create({
      data: {
        order_id: order.id,
        run_at: old,
        status: 'dead',
        updated_at: veryOldJob,
      },
    });
    await prisma.webhookJob.create({
      data: {
        order_id: order.id,
        run_at: old,
        status: 'succeeded',
        updated_at: recentJob,
      },
    });

    const result = await runCleanupWorkerOnce({
      prisma,
      now,
      sessionGraceMs: 24 * 60 * 60 * 1000,
      webhookJobGraceMs: 7 * 24 * 60 * 60 * 1000,
    });

    expect(result.deletedOldSessions).toBe(2);
    expect(result.deletedOldJobs).toBe(2);
    expect(result.requeuedStuckJobs).toBe(1);

    const sessionCount = await prisma.session.count();
    expect(sessionCount).toBe(2);

    const stuckAfter = await prisma.webhookJob.findUnique({ where: { id: stuck.id } });
    expect(stuckAfter?.status).toBe('queued');
    expect(stuckAfter?.lock_expires_at).toBeNull();

    const jobsLeft = await prisma.webhookJob.count();
    expect(jobsLeft).toBe(2);

    await prisma.$disconnect();
  });
});
