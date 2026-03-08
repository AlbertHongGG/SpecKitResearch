import { describe, expect, it } from 'vitest';
import { ReturnPayloadSchema } from '../src/orders';

describe('Return/Webhook payload consistency', () => {
  it('ReturnPayload fields are stable', () => {
    const shapeKeys = Object.keys((ReturnPayloadSchema as any)._def.shape());
    expect(shapeKeys.sort()).toEqual(
      ['amount', 'completed_at', 'currency', 'error_code', 'error_message', 'order_no', 'status'].sort(),
    );
  });
});
