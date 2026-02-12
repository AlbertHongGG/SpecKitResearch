import { describe, it, expect } from 'vitest';
import { loginSchema } from '../../src/lib/validation';

describe('validation', () => {
  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '123' });
    expect(result.success).toBe(false);
  });
});
