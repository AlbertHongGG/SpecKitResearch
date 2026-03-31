import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { ProviderBookingsService } from '../../src/provider/provider-bookings.service';
import { ServicesService } from '../../src/services/services.service';
import { TimeSlotsService } from '../../src/timeslots/timeslots.service';
import {
  BookingStatus,
  ServiceStatus,
  TimeSlotStatus,
  UserRole,
  UserStatus,
} from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US3 provider ownership isolation', () => {
  it('prevents provider from updating another provider\'s service/timeslot/booking', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider1 = await prisma.user.create({
        data: { email: 'p1@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const provider2 = await prisma.user.create({
        data: { email: 'p2@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const user = await prisma.user.create({
        data: { email: 'u@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });

      const service = await prisma.service.create({
        data: {
          providerId: provider1.id,
          name: 'S1',
          description: 'D',
          durationMinutes: 30,
          status: ServiceStatus.ACTIVE,
        },
      });

      const now = new Date('2026-03-04T00:00:00.000Z');
      const slot = await prisma.timeSlot.create({
        data: {
          serviceId: service.id,
          startTime: new Date(now.getTime() + 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 90 * 60 * 1000),
          capacity: 2,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const services = new ServicesService(prisma as unknown as never, audit);
      const timeSlots = new TimeSlotsService(prisma as unknown as never, audit);
      const bookings = new BookingsService(prisma as unknown as never, audit);
      const providerBookings = new ProviderBookingsService(prisma as unknown as never, audit);

      const booking = await bookings.createBooking({ userId: user.id, timeSlotId: slot.id });
      expect(booking.status).toBe(BookingStatus.PENDING);

      await expect(
        services.updateProviderService({ providerId: provider2.id, serviceId: service.id, patch: { name: 'X' } }),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        timeSlots.listProviderTimeSlots({ providerId: provider2.id, serviceId: service.id }),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        timeSlots.updateProviderTimeSlot({ providerId: provider2.id, timeSlotId: slot.id, patch: { capacity: 1 } }),
      ).rejects.toBeInstanceOf(NotFoundException);

      await expect(
        providerBookings.updateBookingStatus({
          providerId: provider2.id,
          bookingId: booking.id,
          targetStatus: BookingStatus.CONFIRMED,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await cleanup();
    }
  });

  it('lists only bookings belonging to the provider', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider1 = await prisma.user.create({
        data: { email: 'p1b@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const provider2 = await prisma.user.create({
        data: { email: 'p2b@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const user = await prisma.user.create({
        data: { email: 'ub@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });

      const s1 = await prisma.service.create({
        data: {
          providerId: provider1.id,
          name: 'S1',
          description: 'D',
          durationMinutes: 30,
          status: ServiceStatus.ACTIVE,
        },
      });
      const s2 = await prisma.service.create({
        data: {
          providerId: provider2.id,
          name: 'S2',
          description: 'D',
          durationMinutes: 30,
          status: ServiceStatus.ACTIVE,
        },
      });

      const now = new Date('2026-03-04T00:00:00.000Z');
      const ts1 = await prisma.timeSlot.create({
        data: {
          serviceId: s1.id,
          startTime: new Date(now.getTime() + 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 90 * 60 * 1000),
          capacity: 2,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });
      const ts2 = await prisma.timeSlot.create({
        data: {
          serviceId: s2.id,
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
          capacity: 2,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 60 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const bookings = new BookingsService(prisma as unknown as never, audit);
      const providerBookings = new ProviderBookingsService(prisma as unknown as never, audit);

      await bookings.createBooking({ userId: user.id, timeSlotId: ts1.id });
      await bookings.createBooking({ userId: user.id, timeSlotId: ts2.id });

      const list1 = await providerBookings.listBookings({ providerId: provider1.id });
      const list2 = await providerBookings.listBookings({ providerId: provider2.id });
      expect(list1.items.length).toBe(1);
      expect(list1.items[0]?.serviceId).toBe(s1.id);
      expect(list2.items.length).toBe(1);
      expect(list2.items[0]?.serviceId).toBe(s2.id);
    } finally {
      await cleanup();
    }
  });
});
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { ServicesService } from '../../src/services/services.service';
import { TimeSlotsService } from '../../src/timeslots/timeslots.service';
import {
  BookingStatus,
  ServiceStatus,
  TimeSlotStatus,
  UserRole,
  UserStatus,
} from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US3 provider ownership isolation', () => {
  it('prevents provider2 from updating provider1 resources', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider1 = await prisma.user.create({
        data: { email: 'p1@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const provider2 = await prisma.user.create({
        data: { email: 'p2@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });

      const user = await prisma.user.create({
        data: { email: 'u@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
      });

      const service = await prisma.service.create({
        data: {
          providerId: provider1.id,
          name: 'S1',
          description: 'D',
          durationMinutes: 30,
          status: ServiceStatus.ACTIVE,
        },
      });

      const slot = await prisma.timeSlot.create({
        data: {
          serviceId: service.id,
          startTime: new Date('2026-03-10T10:00:00.000Z'),
          endTime: new Date('2026-03-10T10:30:00.000Z'),
          capacity: 1,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date('2026-03-10T09:00:00.000Z'),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const services = new ServicesService(prisma as unknown as never, audit);
      const timeSlots = new TimeSlotsService(prisma as unknown as never, audit);
      const bookings = new BookingsService(prisma as unknown as never, audit);
      const providerBookings = new ProviderBookingsService(prisma as unknown as never, audit);

      // provider2 cannot update provider1 service
      await expect(
        services.updateProviderService({
          providerId: provider2.id,
          serviceId: service.id,
          patch: { name: 'HACK' },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // provider2 cannot list provider1 timeslots
      await expect(
        timeSlots.listProviderTimeSlots({ providerId: provider2.id, serviceId: service.id }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // create a booking owned by provider1's service
      const booking = await bookings.createBooking({ userId: user.id, timeSlotId: slot.id });
      expect(booking.status).toBe(BookingStatus.PENDING);

      // provider2 cannot update booking status
      await expect(
        providerBookings.updateBookingStatus({
          providerId: provider2.id,
          bookingId: booking.id,
          targetStatus: BookingStatus.CONFIRMED,
          now: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await cleanup();
    }
  });

  it('enforces booking status transition rules for provider', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const provider = await prisma.user.create({
        data: { email: 'p@example.com', passwordHash: 'x', role: UserRole.PROVIDER, status: UserStatus.ACTIVE },
      });
      const user = await prisma.user.create({
        data: { email: 'u@example.com', passwordHash: 'x', role: UserRole.USER, status: UserStatus.ACTIVE },
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
      const slot = await prisma.timeSlot.create({
        data: {
          serviceId: service.id,
          startTime: new Date('2026-03-10T10:00:00.000Z'),
          endTime: new Date('2026-03-10T10:30:00.000Z'),
          capacity: 1,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date('2026-03-10T09:00:00.000Z'),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const bookings = new BookingsService(prisma as unknown as never, audit);
      const providerBookings = new ProviderBookingsService(prisma as unknown as never, audit);
      const booking = await bookings.createBooking({ userId: user.id, timeSlotId: slot.id });

      // invalid transition: PENDING -> COMPLETED
      await expect(
        providerBookings.updateBookingStatus({
          providerId: provider.id,
          bookingId: booking.id,
          targetStatus: BookingStatus.COMPLETED,
          now: new Date('2026-03-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      try {
        await providerBookings.updateBookingStatus({
          providerId: provider.id,
          bookingId: booking.id,
          targetStatus: BookingStatus.COMPLETED,
          now: new Date('2026-03-01T00:00:00.000Z'),
        });
      } catch (e: unknown) {
        if (!(e instanceof ConflictException)) throw e;
        expect(e.getResponse()).toMatchObject({ code: ErrorCodes.BOOKING_STATE_INVALID_TRANSITION });
      }
    } finally {
      await cleanup();
    }
  });
});
