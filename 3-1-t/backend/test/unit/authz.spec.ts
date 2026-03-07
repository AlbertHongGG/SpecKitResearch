import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

import { OwnershipService } from '../../src/auth/ownership/ownership.service';
import { RolesGuard } from '../../src/auth/rbac/roles.guard';

function createContext(currentUser?: { id: string; roles: string[] }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ currentUser }),
    }),
  } as unknown as ExecutionContext;
}

describe('authz', () => {
  describe('OwnershipService', () => {
    const ownershipService = new OwnershipService();

    it('allows matching buyer ownership', () => {
      expect(() =>
        ownershipService.assertBuyer('u1', {
          id: 'u1',
          roles: ['BUYER'] as any,
        }),
      ).not.toThrow();
    });

    it('rejects mismatched seller ownership', () => {
      expect(() =>
        ownershipService.assertSeller('seller-1', {
          id: 'seller-2',
          roles: ['SELLER'] as any,
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('RolesGuard', () => {
    it('allows access when no roles required', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(undefined),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('throws unauthorized when roles required but user missing', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['BUYER']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      expect(() => guard.canActivate(createContext())).toThrow(
        UnauthorizedException,
      );
    });

    it('throws forbidden when user lacks required roles', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      expect(() =>
        guard.canActivate(createContext({ id: 'u1', roles: ['BUYER'] })),
      ).toThrow(ForbiddenException);
    });

    it('allows when user has one required role', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SELLER']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);

      expect(
        guard.canActivate(createContext({ id: 'u1', roles: ['SELLER'] })),
      ).toBe(true);
    });
  });
});
