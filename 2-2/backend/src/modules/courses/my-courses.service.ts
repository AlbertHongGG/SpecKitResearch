import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';

@Injectable()
export class MyCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyCourses(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });

    if (purchases.length === 0) {
      return [];
    }

    const courseIds = purchases.map((p: any) => p.courseId);
    const lessons = await this.prisma.lesson.findMany({
      where: { section: { courseId: { in: courseIds } } },
      select: { id: true, section: { select: { courseId: true } } },
    });
    const lessonsByCourse = new Map<string, number>();
    const lessonToCourse = new Map<string, string>();
    for (const lesson of lessons) {
      lessonsByCourse.set(
        lesson.section.courseId,
        (lessonsByCourse.get(lesson.section.courseId) ?? 0) + 1,
      );
      lessonToCourse.set(lesson.id, lesson.section.courseId);
    }

    const completedCounts = await this.prisma.lessonProgress.groupBy({
      by: ['lessonId'],
      _count: { _all: true },
      where: { userId, isCompleted: true },
    });
    const completedLessonIds = new Set(completedCounts.map((c: any) => c.lessonId));

    const completedByCourse = new Map<string, number>();
    for (const lessonId of completedLessonIds) {
      const courseId = lessonToCourse.get(lessonId as string);
      if (courseId) {
        completedByCourse.set(courseId, (completedByCourse.get(courseId) ?? 0) + 1);
      }
    }

    return purchases.map((purchase: any) => ({
      course: purchase.course,
      purchasedAt: purchase.createdAt,
      progress: {
        completedLessons: completedByCourse.get(purchase.courseId) ?? 0,
        totalLessons: lessonsByCourse.get(purchase.courseId) ?? 0,
      },
    }));
  }
}
