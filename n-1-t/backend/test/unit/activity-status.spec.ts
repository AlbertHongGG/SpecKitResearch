import { ActivityStatus } from '@prisma/client';

import { canAdminTransition, deriveAutoStatus } from '../../src/activities/activity-status';

describe('activity-status', () => {
  describe('canAdminTransition', () => {
    test('published/full can transition to closed', () => {
      expect(canAdminTransition(ActivityStatus.PUBLISHED, ActivityStatus.CLOSED)).toBe(true);
      expect(canAdminTransition(ActivityStatus.FULL, ActivityStatus.CLOSED)).toBe(true);
    });

    test('draft/closed can transition to archived', () => {
      expect(canAdminTransition(ActivityStatus.DRAFT, ActivityStatus.ARCHIVED)).toBe(true);
      expect(canAdminTransition(ActivityStatus.CLOSED, ActivityStatus.ARCHIVED)).toBe(true);
    });

    test('invalid transitions are rejected', () => {
      expect(canAdminTransition(ActivityStatus.DRAFT, ActivityStatus.PUBLISHED)).toBe(false);
      expect(canAdminTransition(ActivityStatus.PUBLISHED, ActivityStatus.ARCHIVED)).toBe(false);
      expect(canAdminTransition(ActivityStatus.ARCHIVED, ActivityStatus.CLOSED)).toBe(false);
    });
  });

  describe('deriveAutoStatus', () => {
    test('published -> full when registeredCount >= capacity', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const deadline = new Date('2026-01-02T00:00:00.000Z');
      const date = new Date('2026-01-03T00:00:00.000Z');

      expect(
        deriveAutoStatus({
          current: ActivityStatus.PUBLISHED,
          registeredCount: 10,
          capacity: 10,
          now,
          deadline,
          date,
        }),
      ).toBe(ActivityStatus.FULL);
    });

    test('full -> published when it becomes registerable again', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const deadline = new Date('2026-01-02T00:00:00.000Z');
      const date = new Date('2026-01-03T00:00:00.000Z');

      expect(
        deriveAutoStatus({
          current: ActivityStatus.FULL,
          registeredCount: 0,
          capacity: 10,
          now,
          deadline,
          date,
        }),
      ).toBe(ActivityStatus.PUBLISHED);
    });

    test('does not auto-change unrelated statuses', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const deadline = new Date('2026-01-02T00:00:00.000Z');
      const date = new Date('2026-01-03T00:00:00.000Z');

      expect(
        deriveAutoStatus({
          current: ActivityStatus.DRAFT,
          registeredCount: 0,
          capacity: 10,
          now,
          deadline,
          date,
        }),
      ).toBe(ActivityStatus.DRAFT);
    });
  });
});
