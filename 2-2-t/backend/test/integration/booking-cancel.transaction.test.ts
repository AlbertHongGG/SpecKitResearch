import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import {
  BookingStatus,
  ServiceStatus,
  TimeSlotStatus,
  UserRole,
  UserStatus,
} from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US2 cancelBooking transaction (deadline/idempotent)', () => {
  it('cancels once and releases exactly one seat', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'p@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      const user = await prisma.user.create({
        data: { email: 'u@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
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
          capacity: 1,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const svc = new BookingsService(prisma as unknown as never, audit);

      const booking = await svc.createBooking({ userId: user.id, timeSlotId: timeSlot.id });
      expect(booking.status).toBe(BookingStatus.PENDING);

      const slotAfterCreate = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfterCreate?.bookedCount).toBe(1);

      const cancelAt = new Date(now.getTime() + 10 * 60 * 1000);
      const cancelled = await svc.cancelBooking({ userId: user.id, bookingId: booking.id, now: cancelAt });
      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.cancelledAt?.toISOString()).toBe(cancelAt.toISOString());

      const slotAfterCancel = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfterCancel?.bookedCount).toBe(0);

      await expect(svc.cancelBooking({ userId: user.id, bookingId: booking.id, now: cancelAt })).rejects.toBeInstanceOf(
        ConflictException,
      );

      try {
        await svc.cancelBooking({ userId: user.id, bookingId: booking.id, now: cancelAt });
      } catch (e: unknown) {
        if (!(e instanceof ConflictException)) throw e;
        expect(e.getResponse()).toMatchObject({ code: ErrorCodes.BOOKING_ALREADY_CANCELLED });
      }

      const slotAfterSecond = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfterSecond?.bookedCount).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it('rejects cancellation after deadline without releasing seat', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'p@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      const user = await prisma.user.create({
        data: { email: 'u@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
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
          capacity: 1,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 1 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const svc = new BookingsService(prisma as unknown as never, audit);
      const booking = await svc.createBooking({ userId: user.id, timeSlotId: timeSlot.id });

      const afterDeadline = new Date(now.getTime() + 10 * 60 * 1000);
      await expect(svc.cancelBooking({ userId: user.id, bookingId: booking.id, now: afterDeadline })).rejects.toBeInstanceOf(
        ConflictException,
      );

      try {
        await svc.cancelBooking({ userId: user.id, bookingId: booking.id, now: afterDeadline });
      } catch (e: unknown) {
        if (!(e instanceof ConflictException)) throw e;
        expect(e.getResponse()).toMatchObject({ code: ErrorCodes.BOOKING_NOT_CANCELLABLE });
      }

      const slotAfter = await prisma.timeSlot.findUnique({ where: { id: timeSlot.id } });
      expect(slotAfter?.bookedCount).toBe(1);

      const bookingAfter = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(bookingAfter?.status).toBe(BookingStatus.PENDING);
    } finally {
      await cleanup();
    }
  });
});
