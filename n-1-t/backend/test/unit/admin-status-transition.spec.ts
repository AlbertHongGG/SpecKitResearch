import { ActivityStatus } from '@prisma/client';

import { canAdminTransition } from '../../src/activities/activity-status';

describe('admin status transition rules', () => {
  test('published/full -> closed is allowed', () => {
    expect(canAdminTransition(ActivityStatus.PUBLISHED, ActivityStatus.CLOSED)).toBe(true);
    expect(canAdminTransition(ActivityStatus.FULL, ActivityStatus.CLOSED)).toBe(true);
  });

  test('draft/closed -> archived is allowed', () => {
    expect(canAdminTransition(ActivityStatus.DRAFT, ActivityStatus.ARCHIVED)).toBe(true);
    expect(canAdminTransition(ActivityStatus.CLOSED, ActivityStatus.ARCHIVED)).toBe(true);
  });

  test('other transitions are rejected', () => {
    expect(canAdminTransition(ActivityStatus.DRAFT, ActivityStatus.PUBLISHED)).toBe(false);
    expect(canAdminTransition(ActivityStatus.PUBLISHED, ActivityStatus.ARCHIVED)).toBe(false);
    expect(canAdminTransition(ActivityStatus.CLOSED, ActivityStatus.PUBLISHED)).toBe(false);
  });
});
