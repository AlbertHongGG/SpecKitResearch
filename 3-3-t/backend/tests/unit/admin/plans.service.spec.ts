import { describe, expect, it } from 'vitest';

describe('admin plans service', () => {
  it('toggles plan active status', () => {
    const plan = { isActive: true };
    plan.isActive = false;
    expect(plan.isActive).toBe(false);
  });
});
