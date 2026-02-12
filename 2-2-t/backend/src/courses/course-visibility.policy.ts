import { Injectable } from '@nestjs/common';
import { canViewCourseMarketing } from '../common/auth/policies';
import type { Course, User } from '@prisma/client';

@Injectable()
export class CourseVisibilityPolicy {
  canViewMarketing(course: Course, viewer?: Pick<User, 'id' | 'role'> | null): boolean {
    return canViewCourseMarketing({
      courseStatus: course.status,
      ownerUserId: course.instructorId,
      viewerUserId: viewer?.id,
      viewerRole: viewer?.role,
    });
  }
}
