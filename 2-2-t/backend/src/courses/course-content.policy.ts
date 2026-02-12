import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { canAccessCourseContent } from '../common/auth/policies';

@Injectable()
export class CourseContentPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async canAccess(courseId: string, viewer?: { id: string; role: string } | null): Promise<boolean> {
    if (!viewer?.id) return false;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) return false;

    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: viewer.id, courseId } },
      select: { id: true },
    });

    return canAccessCourseContent({
      viewerUserId: viewer.id,
      viewerRole: viewer.role as any,
      ownerUserId: course.instructorId,
      isPurchased: Boolean(purchase),
    });
  }
}
