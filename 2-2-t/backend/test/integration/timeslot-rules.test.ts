import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { TimeSlotsService } from '../../src/timeslots/timeslots.service';
import { ServiceStatus, TimeSlotStatus, UserRole, UserStatus } from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US3 provider timeslot rules', () => {
  it('rejects overlapping time slots for the same service', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'po@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
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
      const audit = new AuditLogsService(prisma as unknown as never);
      const timeSlots = new TimeSlotsService(prisma as unknown as never, audit);

      const a = await timeSlots.createProviderTimeSlot({
        providerId: provider.id,
        serviceId: service.id,
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 90 * 60 * 1000),
        capacity: 2,
        cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        status: TimeSlotStatus.OPEN,
      });
      expect(a.remaining).toBe(2);

      await expect(
        timeSlots.createProviderTimeSlot({
          providerId: provider.id,
          serviceId: service.id,
          startTime: new Date(now.getTime() + 80 * 60 * 1000),
          endTime: new Date(now.getTime() + 110 * 60 * 1000),
          capacity: 2,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
          status: TimeSlotStatus.OPEN,
        }),
      ).rejects.toMatchObject({
        response: { code: ErrorCodes.TIMESLOT_OVERLAP },
      });
    } finally {
      await cleanup();
    }
  });

  it('rejects capacity reduction below bookedCount and overlaps on update', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'pr@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const user = await prisma.user.create({
        data: { email: 'ur@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
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
      const audit = new AuditLogsService(prisma as unknown as never);
      const timeSlots = new TimeSlotsService(prisma as unknown as never, audit);
      const bookings = new BookingsService(prisma as unknown as never, audit);

      const slot1 = await timeSlots.createProviderTimeSlot({
        providerId: provider.id,
        serviceId: service.id,
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 90 * 60 * 1000),
        capacity: 2,
        cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        status: TimeSlotStatus.OPEN,
      });
      const slot2 = await timeSlots.createProviderTimeSlot({
        providerId: provider.id,
        serviceId: service.id,
        startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
        capacity: 2,
        cancelDeadlineAt: new Date(now.getTime() + 60 * 60 * 1000),
        status: TimeSlotStatus.OPEN,
      });

      await bookings.createBooking({ userId: user.id, timeSlotId: slot1.id });

      await expect(
        timeSlots.updateProviderTimeSlot({
          providerId: provider.id,
          timeSlotId: slot1.id,
          patch: { capacity: 0 },
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      try {
        await timeSlots.updateProviderTimeSlot({
          providerId: provider.id,
          timeSlotId: slot1.id,
          patch: { capacity: 0 },
        });
      } catch (e: unknown) {
        if (!(e instanceof ConflictException)) throw e;
        expect(e.getResponse()).toMatchObject({ code: ErrorCodes.TIMESLOT_CAPACITY_BELOW_BOOKED });
      }

      await expect(
        timeSlots.updateProviderTimeSlot({
          providerId: provider.id,
          timeSlotId: slot2.id,
          patch: {
            startTime: new Date(now.getTime() + 70 * 60 * 1000),
            endTime: new Date(now.getTime() + 85 * 60 * 1000),
          },
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      try {
        await timeSlots.updateProviderTimeSlot({
          providerId: provider.id,
          timeSlotId: slot2.id,
          patch: {
            startTime: new Date(now.getTime() + 70 * 60 * 1000),
            endTime: new Date(now.getTime() + 85 * 60 * 1000),
          },
        });
      } catch (e: unknown) {
        if (!(e instanceof ConflictException)) throw e;
        expect(e.getResponse()).toMatchObject({ code: ErrorCodes.TIMESLOT_OVERLAP });
      }
    } finally {
      await cleanup();
    }
  });
});
