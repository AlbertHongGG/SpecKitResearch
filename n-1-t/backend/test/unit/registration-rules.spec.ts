import { describe, expect, test } from '@jest/globals';
import { ActivityStatus } from '@prisma/client';

import { ensureCancelable, ensureRegisterable } from '../../src/registrations/registration-rules';

describe('registration rules', () => {
  test('ensureRegisterable: ok for published before deadline/date with capacity', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(
      ensureRegisterable({
        status: ActivityStatus.PUBLISHED,
        now,
        deadline,
        date,
        registeredCount: 0,
        capacity: 1,
      }),
    ).toEqual({ ok: true });
  });

  test('ensureRegisterable: rejects non-published', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(
      ensureRegisterable({
        status: ActivityStatus.FULL,
        now,
        deadline,
        date,
        registeredCount: 0,
        capacity: 10,
      }),
    ).toEqual({ ok: false, reason: 'Not registerable' });
  });

  test('ensureRegisterable: rejects when deadline passed', () => {
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const now = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(
      ensureRegisterable({
        status: ActivityStatus.PUBLISHED,
        now,
        deadline,
        date,
        registeredCount: 0,
        capacity: 10,
      }),
    ).toEqual({ ok: false, reason: 'Deadline passed' });
  });

  test('ensureRegisterable: rejects when activity already started', () => {
    const date = new Date('2026-01-02T00:00:00.000Z');
    const now = new Date('2026-01-02T00:00:00.000Z');
    const deadline = new Date('2026-01-03T00:00:00.000Z');

    expect(
      ensureRegisterable({
        status: ActivityStatus.PUBLISHED,
        now,
        deadline,
        date,
        registeredCount: 0,
        capacity: 10,
      }),
    ).toEqual({ ok: false, reason: 'Activity already started' });
  });

  test('ensureRegisterable: rejects when full', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(
      ensureRegisterable({
        status: ActivityStatus.PUBLISHED,
        now,
        deadline,
        date,
        registeredCount: 2,
        capacity: 2,
      }),
    ).toEqual({ ok: false, reason: 'Full' });
  });

  test('ensureCancelable: ok before deadline and before date', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(ensureCancelable({ now, deadline, date })).toEqual({ ok: true });
  });

  test('ensureCancelable: rejects when deadline passed', () => {
    const deadline = new Date('2026-01-02T00:00:00.000Z');
    const now = new Date('2026-01-02T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(ensureCancelable({ now, deadline, date })).toEqual({ ok: false, reason: 'Deadline passed' });
  });

  test('ensureCancelable: rejects when activity already started', () => {
    const now = new Date('2026-01-03T00:00:00.000Z');
    const deadline = new Date('2026-01-04T00:00:00.000Z');
    const date = new Date('2026-01-03T00:00:00.000Z');

    expect(ensureCancelable({ now, deadline, date })).toEqual({ ok: false, reason: 'Activity already started' });
  });
});
