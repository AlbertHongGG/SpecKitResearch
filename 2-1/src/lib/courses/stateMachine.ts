import type { CourseStatus } from '@/lib/types';

const allowedTransitions: Record<CourseStatus, CourseStatus[]> = {
  draft: ['submitted'],
  submitted: ['published', 'rejected'],
  published: ['archived'],
  rejected: ['draft'],
  archived: ['published'],
};

export function assertCourseTransition(from: CourseStatus, to: CourseStatus) {
  const allowed = allowedTransitions[from] ?? [];
  return allowed.includes(to);
}
