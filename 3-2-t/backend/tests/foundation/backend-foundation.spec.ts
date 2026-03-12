import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';

describe('backend foundation', () => {
  it('exposes critical error codes', () => {
    expect(ERROR_CODES.UNAUTHENTICATED).toBe('UNAUTHENTICATED');
    expect(ERROR_CODES.PROJECT_ARCHIVED).toBe('PROJECT_ARCHIVED');
  });
});