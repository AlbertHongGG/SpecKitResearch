import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';

import { CsrfMiddleware } from '../../../apps/backend/src/modules/auth/csrf.middleware';

function makeReq(input: {
  method: string;
  path: string;
  headerToken?: string;
  cookieToken?: string;
}) {
  return {
    method: input.method,
    path: input.path,
    header(name: string) {
      if (name.toLowerCase() === 'x-csrf-token') return input.headerToken;
      return undefined;
    },
    cookies: {
      csrf: input.cookieToken,
    },
  } as any;
}

describe('CSRF middleware', () => {
  it('allows safe methods', () => {
    const mw = new CsrfMiddleware();
    const next = vi.fn();

    mw.use(makeReq({ method: 'GET', path: '/orgs' }), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('skips auth/login and auth/csrf', () => {
    const mw = new CsrfMiddleware();

    const next1 = vi.fn();
    mw.use(makeReq({ method: 'POST', path: '/auth/login' }), {} as any, next1);
    expect(next1).toHaveBeenCalledOnce();

    const next2 = vi.fn();
    mw.use(makeReq({ method: 'POST', path: '/auth/csrf' }), {} as any, next2);
    expect(next2).toHaveBeenCalledOnce();
  });

  it('denies mutation when tokens are missing or mismatched', () => {
    const mw = new CsrfMiddleware();
    const next = vi.fn();

    expect(() =>
      mw.use(makeReq({ method: 'POST', path: '/orgs', headerToken: 'a', cookieToken: 'b' }), {} as any, next),
    ).toThrow(ForbiddenException);

    expect(next).not.toHaveBeenCalled();
  });

  it('allows mutation when tokens match', () => {
    const mw = new CsrfMiddleware();
    const next = vi.fn();

    mw.use(makeReq({ method: 'POST', path: '/orgs', headerToken: 't', cookieToken: 't' }), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
