import { describe, expect, it } from 'vitest';

import { isSafeNext } from './middleware';

describe('middleware next param validation', () => {
  it('allows empty/missing next', () => {
    expect(isSafeNext(null)).toBe(true);
    expect(isSafeNext('')).toBe(true);
  });

  it('allows relative paths', () => {
    expect(isSafeNext('/')).toBe(true);
    expect(isSafeNext('/keys')).toBe(true);
    expect(isSafeNext('/admin/users?tab=all')).toBe(true);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeNext('//evil.com')).toBe(false);
    expect(isSafeNext('///evil.com')).toBe(false);
  });

  it('rejects backslash variants', () => {
    expect(isSafeNext('/\\evil.com')).toBe(false);
    expect(isSafeNext('/path\\evil.com')).toBe(false);
  });

  it('rejects control characters', () => {
    expect(isSafeNext('/keys\n/evil')).toBe(false);
    expect(isSafeNext('/keys\r/evil')).toBe(false);
    expect(isSafeNext('/keys\u0000evil')).toBe(false);
  });

  it('rejects absolute and non-path values', () => {
    expect(isSafeNext('http://evil.com')).toBe(false);
    expect(isSafeNext('https://evil.com')).toBe(false);
    expect(isSafeNext('javascript:alert(1)')).toBe(false);
    expect(isSafeNext('evil.com')).toBe(false);
  });
});
