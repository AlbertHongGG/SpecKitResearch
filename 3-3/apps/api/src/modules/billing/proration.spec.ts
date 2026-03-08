import { calculateProrationCents } from './proration';

describe('proration', () => {
  it('returns 0 when upgrading at period end', () => {
    const cents = calculateProrationCents({
      fromPriceCents: 1000,
      toPriceCents: 2000,
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-01T00:00:00.000Z'),
      at: new Date('2026-04-01T00:00:00.000Z'),
    });
    expect(cents).toBe(0);
  });

  it('charges roughly half when upgrading mid-period', () => {
    const cents = calculateProrationCents({
      fromPriceCents: 1000,
      toPriceCents: 3000,
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-01T00:00:00.000Z'),
      at: new Date('2026-03-16T00:00:00.000Z'),
    });
    // diff=2000, remaining is ~16 days of 31 => ~1032.26, we ceil
    expect(cents).toBeGreaterThanOrEqual(1000);
    expect(cents).toBeLessThanOrEqual(1100);
  });

  it('never credits on downgrade (MVP)', () => {
    const cents = calculateProrationCents({
      fromPriceCents: 3000,
      toPriceCents: 1000,
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-01T00:00:00.000Z'),
      at: new Date('2026-03-10T00:00:00.000Z'),
    });
    expect(cents).toBe(0);
  });
});
