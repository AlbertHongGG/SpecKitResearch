import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { setContext } from '../common/request-context';
import { ORG_ROLE_KEY } from './rbac.decorator';
import { RbacGuard } from './rbac.guard';

describe('RbacGuard', () => {
  function makeContext(req: Partial<Request> & { ctx?: any }, handler: unknown = () => undefined): ExecutionContext {
    return {
      getHandler: () => handler as any,
      switchToHttp: () => ({
        getRequest: () => req as Request,
      }),
    } as any;
  }

  it('allows when no required role metadata', () => {
    const reflector = { get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const req: any = {};
    setContext(req as any, { requestId: 'r1', org: { id: 'o1', role: 'END_USER' } });

    expect(guard.canActivate(makeContext(req))).toBe(true);
    expect((reflector as any).get).toHaveBeenCalledWith(ORG_ROLE_KEY, expect.anything());
  });

  it('rejects when org context missing', () => {
    const reflector = { get: jest.fn().mockReturnValue('ORG_ADMIN') } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const req: any = {};
    setContext(req as any, { requestId: 'r1' });

    expect(() => guard.canActivate(makeContext(req))).toThrow(AppError);
    try {
      guard.canActivate(makeContext(req));
    } catch (e) {
      expect((e as AppError).status).toBe(403);
      expect((e as AppError).errorCode).toBe('FORBIDDEN');
    }
  });

  it('rejects END_USER when ORG_ADMIN required', () => {
    const reflector = { get: jest.fn().mockReturnValue('ORG_ADMIN') } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const req: any = {};
    setContext(req as any, { requestId: 'r1', org: { id: 'o1', role: 'END_USER' } });

    expect(() => guard.canActivate(makeContext(req))).toThrow(AppError);
    try {
      guard.canActivate(makeContext(req));
    } catch (e) {
      expect((e as AppError).status).toBe(403);
      expect((e as AppError).errorCode).toBe('FORBIDDEN');
    }
  });

  it('allows ORG_ADMIN when ORG_ADMIN required', () => {
    const reflector = { get: jest.fn().mockReturnValue('ORG_ADMIN') } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const req: any = {};
    setContext(req as any, { requestId: 'r1', org: { id: 'o1', role: 'ORG_ADMIN' } });

    expect(guard.canActivate(makeContext(req))).toBe(true);
  });
});
