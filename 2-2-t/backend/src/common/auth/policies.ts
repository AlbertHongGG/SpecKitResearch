import { CourseStatus, UserRole } from '@prisma/client';

export function canViewCourseMarketing(params: {
  courseStatus: CourseStatus;
  viewerUserId?: string;
  ownerUserId: string;
  viewerRole?: UserRole;
}): boolean {
  const { courseStatus, viewerUserId, ownerUserId, viewerRole } = params;
  if (courseStatus === CourseStatus.published) return true;
  if (!viewerUserId) return false;
  const isOwner = viewerUserId === ownerUserId;
  const isAdmin = viewerRole === UserRole.admin;
  return isOwner || isAdmin;
}

export function canAccessCourseContent(params: {
  viewerUserId?: string;
  viewerRole?: UserRole;
  ownerUserId: string;
  isPurchased: boolean;
}): boolean {
  const { viewerUserId, viewerRole, ownerUserId, isPurchased } = params;
  if (!viewerUserId) return false;
  const isOwner = viewerUserId === ownerUserId;
  const isAdmin = viewerRole === UserRole.admin;
  return isAdmin || isOwner || isPurchased;
}
