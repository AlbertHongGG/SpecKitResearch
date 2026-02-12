import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ErrorCodes, makeError } from '@app/contracts';
import { canAccessCourseContent } from '../common/auth/policies';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgressSummary(params: { userId: string; courseId: string }) {
    const totalLessons = await this.prisma.lesson.count({
      where: { section: { courseId: params.courseId } },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId: params.userId,
        isCompleted: true,
        lesson: { section: { courseId: params.courseId } },
      },
    });

    return { completedLessons, totalLessons };
  }

  async markComplete(params: { userId: string; lessonId: string; viewerRole: string }) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) {
      throw new NotFoundException(makeError(ErrorCodes.NOT_FOUND, 'Lesson 不存在'));
    }

    const course = lesson.section.course;
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId: params.userId, courseId: course.id } },
      select: { id: true },
    });

    const allowed = canAccessCourseContent({
      viewerUserId: params.userId,
      viewerRole: params.viewerRole as any,
      ownerUserId: course.instructorId,
      isPurchased: Boolean(purchase),
    });

    if (!allowed) {
      throw new ForbiddenException(makeError(ErrorCodes.FORBIDDEN, '你沒有存取此課程內容的權限'));
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: params.userId, lessonId: params.lessonId } },
    });

    if (existing) {
      return {
        lessonId: params.lessonId,
        isCompleted: existing.isCompleted,
        completedAt: existing.completedAt ? existing.completedAt.toISOString() : null,
      };
    }

    const created = await this.prisma.lessonProgress.create({
      data: {
        userId: params.userId,
        lessonId: params.lessonId,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    return {
      lessonId: params.lessonId,
      isCompleted: true,
      completedAt: created.completedAt?.toISOString() ?? null,
    };
  }
}
