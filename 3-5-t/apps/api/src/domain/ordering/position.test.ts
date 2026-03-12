import { describe, expect, it } from 'vitest';
import { generateBetween, isPositionStrictlyBetween, type PositionKey } from './position';

describe('ordering position generateBetween', () => {
  it('generates a key between two keys', () => {
    const prev: PositionKey = '0000000000';
    const next: PositionKey = '0000000002';
    const mid = generateBetween(prev, next);

    expect(mid).toHaveLength(prev.length);
    expect(isPositionStrictlyBetween(prev, mid, next)).toBe(true);
  });

  it('generates a key at the beginning when prev is null', () => {
    const next: PositionKey = '0000000005';
    const mid = generateBetween(null, next);

    expect(mid).toHaveLength(next.length);
    expect(isPositionStrictlyBetween(null, mid, next)).toBe(true);
  });

  it('generates a key at the end when next is null', () => {
    const prev: PositionKey = 'zzzzzzzzzu';
    const mid = generateBetween(prev, null);

    expect(mid).toHaveLength(prev.length);
    expect(isPositionStrictlyBetween(prev, mid, null)).toBe(true);
  });
});
