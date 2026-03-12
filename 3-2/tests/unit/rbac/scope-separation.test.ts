import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { OrgMemberGuard } from '../../../apps/backend/src/common/guards/org-member.guard';
import { ProjectMemberGuard } from '../../../apps/backend/src/common/guards/project-member.guard';

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

describe('Scope separation (platform role does not grant org/project access)', () => {
  it('does not allow org access without org membership, even with platform role', async () => {
    const prisma = {
      organizationMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const guard = new OrgMemberGuard(prisma);
    const req = {
      params: { orgId: 'org_1' },
      user: {
        id: 'user_1',
        email: 'u@example.com',
        displayName: 'U',
        platformRole: 'platform_admin',
      },
      originalUrl: '/orgs/org_1',
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not allow project access without project membership, even with platform role', async () => {
    const prisma = {
      projectMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const guard = new ProjectMemberGuard(prisma);
    const req = {
      params: { projectId: 'proj_1' },
      user: {
        id: 'user_1',
        email: 'u@example.com',
        displayName: 'U',
        platformRole: 'platform_admin',
      },
      originalUrl: '/projects/proj_1',
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(NotFoundException);
  });
});
