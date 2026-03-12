import { describe, expect, it } from 'vitest';

import { normalizeEmail } from '../../src/modules/auth/email';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Admin@Example.COM  ')).toBe('admin@example.com');
  });

  it('handles already-normalized emails', () => {
    expect(normalizeEmail('dev@example.com')).toBe('dev@example.com');
  });
});
