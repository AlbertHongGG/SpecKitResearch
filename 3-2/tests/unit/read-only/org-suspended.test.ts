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

describe('ReadOnlyGuard (org suspended)', () => {
  it('blocks org-scoped mutation when org is suspended', async () => {
    const prisma = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ status: 'suspended' }),
      },
    } as any;

    const guard = new ReadOnlyGuard(prisma);
    const req = {
      method: 'POST',
      params: { orgId: 'org_1' },
    };

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(ForbiddenException);

    try {
      await guard.canActivate(makeContext(req));
    } catch (err) {
      const e = err as ForbiddenException;
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.ORG_SUSPENDED });
    }
  });

  it('allows org-scoped mutation when org is active', async () => {
    const prisma = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ status: 'active' }),
      },
    } as any;

    const guard = new ReadOnlyGuard(prisma);
    const req = {
      method: 'POST',
      params: { orgId: 'org_1' },
    };

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
  });
});
