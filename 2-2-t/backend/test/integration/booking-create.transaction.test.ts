import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { ServiceStatus, TimeSlotStatus, UserRole, UserStatus } from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US2 createBooking transaction (no oversell)', () => {
  it('prevents oversell via conditional update + transaction', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'p@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      const user1 = await prisma.user.create({
        data: { email: 'u1@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });
      const user2 = await prisma.user.create({
        data: { email: 'u2@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });

      const service = await prisma.service.create({
        data: {
          providerId: provider.id,
          name: 'S',
          description: 'D',
          durationMinutes: 30,
          status: ServiceStatus.ACTIVE,
        },
      });

      const now = new Date('2026-03-04T00:00:00.000Z');
      const timeSlot = await prisma.timeSlot.create({
        data: {
          serviceId: service.id,
          startTime: new Date(now.getTime() + 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 90 * 60 * 1000),
          capacity: 1,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const svc = new BookingsService(prisma as unknown as never, audit);

      const results = await Promise.allSettled([
        svc.createBooking({ userId: user1.id, timeSlotId: timeSlot.id }),
        svc.createBooking({ userId: user2.id, timeSlotId: timeSlot.id }),
      ]);

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.filter((r) => r.status === 'rejected').length;
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      const rejected = results.find((r) => r.status === 'rejected');
      if (rejected && rejected.status === 'rejected') {
        const err = rejected.reason as unknown;
        expect(err).toBeInstanceOf(ConflictException);
        try {
          throw err;
        } catch (e: unknown) {
          if (!(e instanceof ConflictException)) throw e;
          expect(e.getResponse()).toMatchObject({ code: ErrorCodes.BOOKING_SEAT_FULL });
        }
      }

      const slotAfter = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfter?.bookedCount).toBe(1);
      expect(slotAfter?.bookedCount).toBeLessThanOrEqual(slotAfter!.capacity);
      expect(slotAfter?.bookedCount).toBeGreaterThanOrEqual(0);

      const bookings = await prisma.booking.findMany({ where: { timeSlotId: timeSlot.id } });
      expect(bookings.length).toBe(1);
    } finally {
      await cleanup();
    }
  });

  it('returns 404 for unknown timeSlotId', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const audit = new AuditLogsService(prisma as unknown as never);
      const svc = new BookingsService(prisma as unknown as never, audit);

      await expect(svc.createBooking({ userId: 'u', timeSlotId: '11111111-1111-4111-8111-111111111111' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    } finally {
      await cleanup();
    }
  });
});
