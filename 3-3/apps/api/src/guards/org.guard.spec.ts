import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { setContext } from '../common/request-context';
import { OrgGuard } from './org.guard';

describe('OrgGuard', () => {
  function makeReq(headers: Record<string, string | undefined>): any {
    return {
      header: (name: string) => headers[name.toLowerCase()],
    };
  }

  function makeContext(req: Partial<Request> & { header: (name: string) => string | undefined }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
      }),
    } as any;
  }

  it('rejects when not authenticated', async () => {
    const prisma = {
      organizationMember: { findUnique: jest.fn() },
    } as any;
    const guard = new OrgGuard(prisma);
    const req: any = makeReq({ 'x-organization-id': 'org1' });
    setContext(req as any, { requestId: 'r1' });

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(AppError);
  });

  it('rejects when header missing', async () => {
    const prisma = {
      organizationMember: { findUnique: jest.fn() },
    } as any;
    const guard = new OrgGuard(prisma);
    const req: any = makeReq({});
    setContext(req as any, { requestId: 'r1', user: { id: 'u1', email: 'a@b.com', isPlatformAdmin: false } });

    await expect(guard.canActivate(makeContext(req))).rejects.toMatchObject({ status: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('rejects when not a member', async () => {
    const prisma = {
      organizationMember: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;
    const guard = new OrgGuard(prisma);
    const req: any = makeReq({ 'x-organization-id': 'org1' });
    setContext(req as any, { requestId: 'r1', user: { id: 'u1', email: 'a@b.com', isPlatformAdmin: false } });

    await expect(guard.canActivate(makeContext(req))).rejects.toMatchObject({ status: 403, errorCode: 'FORBIDDEN' });
  });

  it('allows active member and sets org context', async () => {
    const prisma = {
      organizationMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'ORG_ADMIN', status: 'ACTIVE' }),
      },
    } as any;
    const guard = new OrgGuard(prisma);
    const req: any = makeReq({ 'x-organization-id': 'org1' });
    setContext(req as any, { requestId: 'r1', user: { id: 'u1', email: 'a@b.com', isPlatformAdmin: false } });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect((req as any).ctx.org).toEqual({ id: 'org1', role: 'ORG_ADMIN' });
  });
});
