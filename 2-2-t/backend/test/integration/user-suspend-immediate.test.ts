import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { ExecutionContext } from '@nestjs/common';

import { AuditLogsService } from '../../src/audit-logs/audit-logs.service';
import { AdminService } from '../../src/admin/admin.service';
import { ActiveUserGuard } from '../../src/auth/guards/active-user.guard';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { UserRole, UserStatus } from '../../src/generated/prisma/client';

import { createTestDb } from './test-db';

describe('US4 user suspend immediate effect', () => {
  it('rejects protected requests immediately after suspension (ActiveUserGuard)', async () => {
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

      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash: 'x',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });

      const makeContext = (): ExecutionContext => {
        const req = { user: { id: user.id, role: user.role } };
        return {
          switchToHttp: () => ({ getRequest: () => req }),
        } as unknown as ExecutionContext;
      };

      const guard = new ActiveUserGuard(prisma as unknown as never);
      expect(await guard.canActivate(makeContext())).toBe(true);

      const audit = new AuditLogsService(prisma as unknown as never);
      const adminService = new AdminService(prisma as unknown as never, audit);

      await adminService.suspendUser({ actorUserId: admin.id, userId: user.id });

      await expect(async () => guard.canActivate(makeContext())).rejects.toBeInstanceOf(ForbiddenException);
      try {
        await guard.canActivate(makeContext());
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        if (e instanceof ForbiddenException) {
          expect(e.getResponse()).toMatchObject({ code: ErrorCodes.AUTH_USER_SUSPENDED });
        }
      }

      await adminService.activateUser({ actorUserId: admin.id, userId: user.id });
      expect(await guard.canActivate(makeContext())).toBe(true);

      const auditLogs = await prisma.auditLog.findMany({
        where: { targetType: 'User', targetId: user.id },
        orderBy: { createdAt: 'asc' },
      });
      const actions = auditLogs.map((l) => l.action);
      expect(actions).toEqual(expect.arrayContaining(['USER_SUSPEND', 'USER_ACTIVATE']));
    } finally {
      await cleanup();
    }
  });
});
