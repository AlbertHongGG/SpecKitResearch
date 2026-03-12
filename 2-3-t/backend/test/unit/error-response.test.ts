import { describe, expect, it } from 'vitest';

import { ErrorCodes } from '../../src/common/http/error-codes';
import { makeErrorResponse } from '../../src/common/http/error-response';

describe('makeErrorResponse', () => {
  it('returns consistent envelope', () => {
    const res = makeErrorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 'rid-1');
    expect(res).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId: 'rid-1',
      },
    });
  });
});
