import { describe, expect, it } from 'vitest';
import { ApiError, toApiErrorResponse } from '@/lib/shared/apiError';

describe('apiError', () => {
  it('maps ApiError to canonical response shape', () => {
    const err = new ApiError({ status: 422, code: 'VALIDATION', message: 'bad input' });
    expect(toApiErrorResponse(err)).toEqual({
      error: {
        code: 'VALIDATION',
        message: 'bad input',
      },
    });
  });
});
