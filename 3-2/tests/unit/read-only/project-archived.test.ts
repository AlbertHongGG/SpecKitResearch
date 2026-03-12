import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { ReadOnlyGuard } from '../../../apps/backend/src/common/guards/read-only.guard';
import { ErrorCodes } from '../../../apps/backend/src/common/errors/error-codes';

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

describe('ReadOnlyGuard (project archived)', () => {
  it('blocks project-scoped mutation when project is archived', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'proj_1',
          status: 'archived',
          organization: { id: 'org_1', status: 'active' },
        }),
      },
    } as any;

    const guard = new ReadOnlyGuard(prisma);
    const req = {
      method: 'PATCH',
      params: { projectId: 'proj_1' },
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(ForbiddenException);

    try {
      await guard.canActivate(makeContext(req));
    } catch (err) {
      const e = err as ForbiddenException;
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.PROJECT_ARCHIVED });
    }
  });

  it('blocks project-scoped mutation when parent org is suspended (even if project active)', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'proj_1',
          status: 'active',
          organization: { id: 'org_1', status: 'suspended' },
        }),
      },
    } as any;

    const guard = new ReadOnlyGuard(prisma);
    const req = {
      method: 'POST',
      params: { projectId: 'proj_1' },
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(ForbiddenException);

    try {
      await guard.canActivate(makeContext(req));
    } catch (err) {
      const e = err as ForbiddenException;
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.ORG_SUSPENDED });
    }
  });
});
