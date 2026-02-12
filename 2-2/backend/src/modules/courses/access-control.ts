import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Course } from '@prisma/client';

export function ensureCourseVisible(course: Course | null, userId?: string, role?: string) {
  if (!course) {
    throw new NotFoundException('Course not found');
  }
  if (course.status === 'published') {
    return;
  }
  const isOwner = userId && course.instructorId === userId;
  const isAdmin = role === 'admin';
  if (isOwner || isAdmin) {
    return;
  }
  throw new NotFoundException('Course not found');
}

export function ensureContentAccess(course: Course, userId?: string, role?: string, isPurchased?: boolean) {
  const isOwner = userId && course.instructorId === userId;
  const isAdmin = role === 'admin';
  if (isOwner || isAdmin || isPurchased) {
    return;
  }
  throw new ForbiddenException('No access to course content');
}
