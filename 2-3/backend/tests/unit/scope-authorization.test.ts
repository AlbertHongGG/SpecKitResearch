import { describe, expect, it, vi } from 'vitest';

import { ScopeAuthorizationService } from '../../src/shared/auth/scope-authorization.service';

describe('ScopeAuthorizationService', () => {
  it('denies when apiKeyScopes is empty', async () => {
    const prisma = { apiScopeRule: { findFirst: vi.fn() } } as any;
    const svc = new ScopeAuthorizationService(prisma);

    const allowed = await svc.isAllowed('e1', []);
    expect(allowed).toBe(false);
    expect(prisma.apiScopeRule.findFirst).not.toHaveBeenCalled();
  });

  it('allows when a matching allow rule exists', async () => {
    const prisma = { apiScopeRule: { findFirst: vi.fn().mockResolvedValue({ id: 'r1' }) } } as any;
    const svc = new ScopeAuthorizationService(prisma);

    const allowed = await svc.isAllowed('e1', ['demo:read']);
    expect(allowed).toBe(true);
  });

  it('denies when no rule matches', async () => {
    const prisma = { apiScopeRule: { findFirst: vi.fn().mockResolvedValue(null) } } as any;
    const svc = new ScopeAuthorizationService(prisma);

    const allowed = await svc.isAllowed('e1', ['demo:read']);
    expect(allowed).toBe(false);
  });
});
