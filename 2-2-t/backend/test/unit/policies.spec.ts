import { CourseStatus, UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canAccessCourseContent, canViewCourseMarketing } from '../../src/common/auth/policies';

describe('auth policies (unit)', () => {
  describe('canViewCourseMarketing', () => {
    it('allows published courses for everyone', () => {
      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.published,
          ownerUserId: 'owner',
        }),
      ).toBe(true);

      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.published,
          ownerUserId: 'owner',
          viewerUserId: 'someone',
          viewerRole: UserRole.student,
        }),
      ).toBe(true);
    });

    it('denies non-published courses to guests', () => {
      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.draft,
          ownerUserId: 'owner',
        }),
      ).toBe(false);
    });

    it('allows non-published courses to owner or admin only', () => {
      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.submitted,
          ownerUserId: 'owner',
          viewerUserId: 'owner',
          viewerRole: UserRole.instructor,
        }),
      ).toBe(true);

      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.rejected,
          ownerUserId: 'owner',
          viewerUserId: 'admin',
          viewerRole: UserRole.admin,
        }),
      ).toBe(true);

      expect(
        canViewCourseMarketing({
          courseStatus: CourseStatus.archived,
          ownerUserId: 'owner',
          viewerUserId: 'someone',
          viewerRole: UserRole.student,
        }),
      ).toBe(false);
    });
  });

  describe('canAccessCourseContent', () => {
    it('requires authentication', () => {
      expect(
        canAccessCourseContent({
          ownerUserId: 'owner',
          isPurchased: false,
        }),
      ).toBe(false);
    });

    it('allows admin, owner, or purchaser', () => {
      expect(
        canAccessCourseContent({
          viewerUserId: 'admin',
          viewerRole: UserRole.admin,
          ownerUserId: 'owner',
          isPurchased: false,
        }),
      ).toBe(true);

      expect(
        canAccessCourseContent({
          viewerUserId: 'owner',
          viewerRole: UserRole.instructor,
          ownerUserId: 'owner',
          isPurchased: false,
        }),
      ).toBe(true);

      expect(
        canAccessCourseContent({
          viewerUserId: 'student',
          viewerRole: UserRole.student,
          ownerUserId: 'owner',
          isPurchased: true,
        }),
      ).toBe(true);
    });

    it('denies authenticated non-admin non-owner without purchase', () => {
      expect(
        canAccessCourseContent({
          viewerUserId: 'student',
          viewerRole: UserRole.student,
          ownerUserId: 'owner',
          isPurchased: false,
        }),
      ).toBe(false);
    });
  });
});
