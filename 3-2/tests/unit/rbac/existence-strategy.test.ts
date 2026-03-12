import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ErrorCodes } from '../../../apps/backend/src/common/errors/error-codes';
import { OrgRoleGuard } from '../../../apps/backend/src/common/guards/org-role.guard';

function makeContext(req: any) {
  return {
    switchToHttp() {
      return {
        getRequest() {
          return req;
        },
      };
    },
  } as any;
}

describe('Existence strategy (org role guard)', () => {
  it('returns 404 for non-member', async () => {
    const prisma = {
      organizationMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const guard = new OrgRoleGuard(prisma);
    const req = {
      params: { orgId: 'org_1' },
      user: { id: 'user_1', email: 'u@example.com', displayName: 'U' },
      requestId: 'req_1',
      originalUrl: '/orgs/org_1/invites',
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(NotFoundException);

    try {
      await guard.canActivate(makeContext(req));
    } catch (err) {
      const e = err as NotFoundException;
      expect(e.getStatus()).toBe(404);
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.NOT_FOUND });
    }
  });

  it('returns 403 for member with insufficient role', async () => {
    const prisma = {
      organizationMembership: {
        findUnique: vi.fn().mockResolvedValue({
          organizationId: 'org_1',
          userId: 'user_1',
          status: 'active',
          orgRole: 'org_member',
        }),
      },
    } as any;

    const guard = new OrgRoleGuard(prisma);
    const req = {
      params: { orgId: 'org_1' },
      user: { id: 'user_1', email: 'u@example.com', displayName: 'U' },
      requestId: 'req_1',
      originalUrl: '/orgs/org_1/invites',
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(ForbiddenException);

    try {
      await guard.canActivate(makeContext(req));
    } catch (err) {
      const e = err as ForbiddenException;
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.FORBIDDEN });
    }
  });
});
