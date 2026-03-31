import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ServiceStatus, TimeSlotStatus, UserRole, UserStatus } from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US2 booking ownership (IDOR)', () => {
  it('does not list or cancel other users\' bookings', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'p@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      const userA = await prisma.user.create({
        data: { email: 'a@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });
      const userB = await prisma.user.create({
        data: { email: 'b@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });

      const service = await prisma.service.create({
        data: { providerId: provider.id, name: 'S', description: 'D', durationMinutes: 30, status: ServiceStatus.ACTIVE },
      });

      const now = new Date('2026-03-04T00:00:00.000Z');
      const timeSlot = await prisma.timeSlot.create({
        data: {
          serviceId: service.id,
          startTime: new Date(now.getTime() + 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 90 * 60 * 1000),
          capacity: 3,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const svc = new BookingsService(prisma as unknown as never, audit);

      const booking = await svc.createBooking({ userId: userA.id, timeSlotId: timeSlot.id });

      const aList = await svc.listMyBookings({ userId: userA.id });
      expect(aList.items.map((b) => b.id)).toEqual([booking.id]);

      const bList = await svc.listMyBookings({ userId: userB.id });
      expect(bList.items.length).toBe(0);

      await expect(svc.cancelBooking({ userId: userB.id, bookingId: booking.id, now: now })).rejects.toBeInstanceOf(
        NotFoundException,
      );

      const bookingAfter = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(bookingAfter?.status).toBe('PENDING');

      const slotAfter = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfter?.bookedCount).toBe(1);
    } finally {
      await cleanup();
    }
  });
});
