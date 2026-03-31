import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import type { ExecutionContext } from '@nestjs/common';

import { AdminController } from '../../src/admin/admin.controller';
import { ReportsController } from '../../src/admin/reports.controller';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ErrorCodes } from '../../src/common/errors/error-codes';
import { UserRole } from '../../src/generated/prisma/client';

describe('US4 admin RBAC', () => {
  it('blocks non-admin access to /api/admin/* endpoints', async () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const makeContext = (role: UserRole, handler: unknown, classRef: unknown): ExecutionContext => {
      const req = { user: { role } };

      return {
        getHandler: () => handler as never,
        getClass: () => classRef as never,
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;
    };

    // AdminController is annotated with @Roles(UserRole.ADMIN) at the class level.
    expect(guard.canActivate(makeContext(UserRole.ADMIN, AdminController.prototype.listUsers, AdminController))).toBe(true);

    for (const role of [UserRole.USER, UserRole.PROVIDER]) {
      try {
        guard.canActivate(makeContext(role, AdminController.prototype.listUsers, AdminController));
        throw new Error('Expected ForbiddenException');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenException);
        if (e instanceof ForbiddenException) {
          expect(e.getResponse()).toMatchObject({ code: ErrorCodes.FORBIDDEN });
        }
      }
    }

    // ReportsController is also annotated with @Roles(UserRole.ADMIN).
    expect(guard.canActivate(makeContext(UserRole.ADMIN, ReportsController.prototype.reportSummary, ReportsController))).toBe(true);
  });
});
