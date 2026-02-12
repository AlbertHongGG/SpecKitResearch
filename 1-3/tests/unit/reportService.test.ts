// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';

import { prisma } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/password';
import * as reportService from '@/lib/server/services/reportService';

describe('ReportService.getMonthlyReport', () => {
  setupApiTestEnv();

  beforeAll(async () => {
    migrateTestDb();
  });

  beforeEach(async () => {
    await wipeDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('computes totals, percents, and fills missing days', async () => {
    const user = await prisma.user.create({
      data: { email: 'u@example.com', passwordHash: await hashPassword('Password123') },
      select: { id: true },
    });

    const food = await prisma.category.create({
      data: { userId: user.id, name: 'Food', type: 'expense', isActive: true, isDefault: false },
      select: { id: true },
    });

    const salary = await prisma.category.create({
      data: { userId: user.id, name: 'Salary', type: 'income', isActive: true, isDefault: false },
      select: { id: true },
    });

    // Feb 2026 has 28 days.
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: food.id,
          type: 'expense',
          amount: 200,
          dateKey: '2026-02-01',
          date: new Date('2026-02-01T00:00:00.000Z'),
        },
        {
          userId: user.id,
          categoryId: salary.id,
          type: 'income',
          amount: 1000,
          dateKey: '2026-02-02',
          date: new Date('2026-02-02T00:00:00.000Z'),
        },
      ],
    });

    const report = await reportService.getMonthlyReport(user.id, 2026, 2);

    expect(report.year).toBe(2026);
    expect(report.month).toBe(2);
    expect(report.totals).toMatchObject({ income: 1000, expense: 200, net: 800 });

    // expenseByCategory percent should be 100% for the only expense category.
    expect(report.expenseByCategory).toHaveLength(1);
    expect(report.expenseByCategory[0]).toMatchObject({ categoryId: food.id, amount: 200, percent: 100 });

    expect(report.dailySeries).toHaveLength(28);

    const d1 = report.dailySeries.find((d) => d.date === '2026-02-01');
    const d2 = report.dailySeries.find((d) => d.date === '2026-02-02');
    const d3 = report.dailySeries.find((d) => d.date === '2026-02-03');

    expect(d1).toEqual({ date: '2026-02-01', income: 0, expense: 200 });
    expect(d2).toEqual({ date: '2026-02-02', income: 1000, expense: 0 });
    expect(d3).toEqual({ date: '2026-02-03', income: 0, expense: 0 });
  });
});
