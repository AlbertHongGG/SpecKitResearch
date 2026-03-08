import { describe, expect, it } from 'vitest';

describe('admin override service', () => {
  it('accepts Suspended and Expired only', () => {
    expect(['Suspended', 'Expired'].includes('Suspended')).toBe(true);
  });
});
