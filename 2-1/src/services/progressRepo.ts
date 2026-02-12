import { prisma } from '@/db/prisma';

export async function setLessonCompletion(userId: string, lessonId: string, isCompleted: boolean) {
  const now = new Date();
  return prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      isCompleted,
      completedAt: isCompleted ? now : null,
    },
    create: {
      userId,
      lessonId,
      isCompleted,
      completedAt: isCompleted ? now : null,
    },
  });
}

export async function getCourseProgress(userId: string, courseId: string) {
  const totalLessons = await prisma.lesson.count({ where: { section: { courseId } } });
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      isCompleted: true,
      lesson: { section: { courseId } },
    },
  });

  return { completedLessons, totalLessons };
}

export async function listCompletedLessonIdsForCourse(userId: string, courseId: string) {
  const rows = await prisma.lessonProgress.findMany({
    where: {
      userId,
      isCompleted: true,
      lesson: { section: { courseId } },
    },
    select: { lessonId: true },
  });

  return rows.map((r) => r.lessonId);
}
