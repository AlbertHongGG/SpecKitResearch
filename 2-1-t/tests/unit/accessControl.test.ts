import { describe, expect, it } from 'vitest';

import { canAccessCourseContent, canViewCourseMarketing } from '../../src/domain/accessControl';

describe('access control decisions', () => {
  describe('canViewCourseMarketing (404 hide existence)', () => {
    it('published is always viewable', () => {
      expect(
        canViewCourseMarketing({
          courseStatus: 'published',
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: false },
        }),
      ).toBe('ALLOW');
    });

    it('draft is only viewable by author/admin', () => {
      expect(
        canViewCourseMarketing({
          courseStatus: 'draft',
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: false },
        }),
      ).toBe('NOT_FOUND');

      expect(
        canViewCourseMarketing({
          courseStatus: 'draft',
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'someone', role: 'student' },
        }),
      ).toBe('NOT_FOUND');

      expect(
        canViewCourseMarketing({
          courseStatus: 'draft',
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'inst1', role: 'instructor' },
        }),
      ).toBe('ALLOW');

      expect(
        canViewCourseMarketing({
          courseStatus: 'draft',
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'admin1', role: 'admin' },
        }),
      ).toBe('ALLOW');
    });
  });

  describe('canAccessCourseContent (403 forbid)', () => {
    it('unauthenticated is forbidden', () => {
      expect(
        canAccessCourseContent({
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: false },
          isPurchased: false,
        }),
      ).toBe('FORBIDDEN');
    });

    it('purchased student is allowed', () => {
      expect(
        canAccessCourseContent({
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'stu1', role: 'student' },
          isPurchased: true,
        }),
      ).toBe('ALLOW');
    });

    it('author/admin is allowed even without purchase', () => {
      expect(
        canAccessCourseContent({
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'inst1', role: 'instructor' },
          isPurchased: false,
        }),
      ).toBe('ALLOW');

      expect(
        canAccessCourseContent({
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'admin1', role: 'admin' },
          isPurchased: false,
        }),
      ).toBe('ALLOW');
    });

    it('not purchased non-author is forbidden', () => {
      expect(
        canAccessCourseContent({
          courseInstructorId: 'inst1',
          viewer: { isAuthenticated: true, userId: 'stu1', role: 'student' },
          isPurchased: false,
        }),
      ).toBe('FORBIDDEN');
    });
  });
});
