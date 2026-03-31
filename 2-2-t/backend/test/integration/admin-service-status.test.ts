import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { AdminService } from '../../src/admin/admin.service';
import { BookingsService } from '../../src/bookings/bookings.service';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { ServiceStatus, TimeSlotStatus, UserRole, UserStatus } from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US4 service status affects booking create', () => {
  it('prevents booking creation when the service is INACTIVE', async () => {
    const { prisma, cleanup } = await createTestDb();
    try {
      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: 'x',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      const provider = await prisma.user.create({
        data: {
          email: 'provider@example.com',
          passwordHash: 'x',
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'x',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
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
          capacity: 10,
          bookedCount: 0,
          status: TimeSlotStatus.OPEN,
          cancelDeadlineAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });

      const audit = new AuditLogsService(prisma as unknown as never);
      const adminService = new AdminService(prisma as unknown as never, audit);
      const bookings = new BookingsService(prisma as unknown as never, audit);

      await adminService.inactivateService({ actorUserId: admin.id, serviceId: service.id });

      await expect(bookings.createBooking({ userId: user.id, timeSlotId: timeSlot.id })).rejects.toBeInstanceOf(
        ConflictException,
      );
      try {
        await bookings.createBooking({ userId: user.id, timeSlotId: timeSlot.id });
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ConflictException);
        if (e instanceof ConflictException) {
          expect(e.getResponse()).toMatchObject({ code: ErrorCodes.BOOKING_SEAT_FULL });
        }
      }

      await adminService.activateService({ actorUserId: admin.id, serviceId: service.id });

      const booking = await bookings.createBooking({ userId: user.id, timeSlotId: timeSlot.id });
      expect(booking).toMatchObject({ userId: user.id, timeSlotId: timeSlot.id, status: 'PENDING' });

      const auditLogs = await prisma.auditLog.findMany({
        where: { targetType: 'Service', targetId: service.id },
        orderBy: { createdAt: 'asc' },
      });
      const actions = auditLogs.map((l) => l.action);
      expect(actions).toEqual(expect.arrayContaining(['SERVICE_INACTIVATE', 'SERVICE_ACTIVATE']));
    } finally {
      await cleanup();
    }
  });
});
