import { describe, expect, it } from 'vitest';
import { HttpError } from '../../http/errors';
import { assertWipAllowsAdd } from './wip';

describe('list WIP policy', () => {
  it('allows when list is not WIP-limited', () => {
    expect(() => assertWipAllowsAdd({ isWipLimited: false, wipLimit: null }, 999)).not.toThrow();
  });

  it('allows when under the limit', () => {
    expect(() => assertWipAllowsAdd({ isWipLimited: true, wipLimit: 3 }, 2)).not.toThrow();
  });

  it('rejects when at/over the limit without override', () => {
    expect(() => assertWipAllowsAdd({ isWipLimited: true, wipLimit: 3 }, 3)).toThrowError(HttpError);
    try {
      assertWipAllowsAdd({ isWipLimited: true, wipLimit: 3 }, 3);
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.code).toBe('WIP_LIMIT_EXCEEDED');
      expect(e.details).toEqual({ wipLimit: 3, currentActiveCount: 3 });
    }
  });

  it('allows when at/over the limit with override enabled', () => {
    expect(() => assertWipAllowsAdd({ isWipLimited: true, wipLimit: 3 }, 3, { enabled: true, reason: 'rush' }))
      .not.toThrow();
  });
});
