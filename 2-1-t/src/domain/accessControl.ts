import type { CourseStatus } from '@prisma/client';

import type { Role } from './rbac';

export type ViewerContext =
  | { isAuthenticated: false }
  | { isAuthenticated: true; userId: string; role: Role };

export type CourseVisibilityDecision = 'ALLOW' | 'NOT_FOUND';

export function canViewCourseMarketing(params: {
  courseStatus: CourseStatus;
  courseInstructorId: string;
  viewer: ViewerContext;
}): CourseVisibilityDecision {
  const { courseStatus, courseInstructorId, viewer } = params;

  if (courseStatus === 'published') return 'ALLOW';

  if (!viewer.isAuthenticated) return 'NOT_FOUND';

  if (viewer.role === 'admin') return 'ALLOW';

  if (viewer.userId === courseInstructorId) return 'ALLOW';

  return 'NOT_FOUND';
}

export type CourseContentDecision = 'ALLOW' | 'FORBIDDEN';

export function canAccessCourseContent(params: {
  courseInstructorId: string;
  viewer: ViewerContext;
  isPurchased: boolean;
}): CourseContentDecision {
  const { courseInstructorId, viewer, isPurchased } = params;

  if (!viewer.isAuthenticated) return 'FORBIDDEN';

  if (viewer.role === 'admin') return 'ALLOW';

  if (viewer.userId === courseInstructorId) return 'ALLOW';

  return isPurchased ? 'ALLOW' : 'FORBIDDEN';
}
