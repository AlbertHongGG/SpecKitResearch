import { describe, it, expect } from 'vitest';
import { RolesGuard } from '../../../src/modules/auth/roles.guard.js';

const reflector = {
  getAllAndOverride: () => ['admin'],
} as any;

const context = {
  getHandler: () => null,
  getClass: () => null,
  switchToHttp: () => ({
    getRequest: () => ({ user: { role: 'admin' } }),
  }),
} as any;

describe('RolesGuard', () => {
  it('allows matching role', () => {
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });
});
