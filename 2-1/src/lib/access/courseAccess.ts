import type { CourseStatus, Role } from '@/lib/types';

export function canViewMarketing(params: {
  courseStatus: CourseStatus;
  isAuthor: boolean;
  role: Role | null;
}): boolean {
  const { courseStatus, isAuthor, role } = params;
  if (courseStatus === 'published') return true;
  if (role === 'admin') return true;
  if (isAuthor) return true;
  return false;
}

export function shouldHideMarketingAs404(params: {
  courseStatus: CourseStatus;
  isAuthor: boolean;
  role: Role | null;
}) {
  return !canViewMarketing(params);
}

export function canReadContent(params: {
  isAuthor: boolean;
  isPurchased: boolean;
  role: Role | null;
}): boolean {
  const { isAuthor, isPurchased, role } = params;
  if (role === 'admin') return true;
  if (isAuthor) return true;
  if (isPurchased) return true;
  return false;
}
