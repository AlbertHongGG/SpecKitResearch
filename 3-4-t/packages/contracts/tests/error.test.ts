import { describe, expect, it } from 'vitest';
import { ErrorCode, ErrorEnvelopeSchema } from '../src/error';

describe('ErrorEnvelopeSchema', () => {
  it('parses valid error envelope', () => {
    const parsed = ErrorEnvelopeSchema.parse({
      ok: false,
      requestId: 'req_123',
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid',
        fieldErrors: {
          email: ['Required'],
        },
      },
    });

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('rejects missing requestId', () => {
    const result = ErrorEnvelopeSchema.safeParse({
      ok: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Boom' },
    });
    expect(result.success).toBe(false);
  });
});
