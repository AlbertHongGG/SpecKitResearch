import { prisma } from '@/db/prisma';

export async function listPublishedCourses(params: {
  categoryId?: string;
  tagIds?: string[];
  query?: string;
}) {
  const { categoryId, tagIds, query } = params;

  const courses = await prisma.course.findMany({
    where: {
      status: 'published',
      ...(categoryId ? { categoryId } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
            ],
          }
        : {}),
      ...(tagIds?.length
        ? {
            tags: {
              some: {
                tagId: { in: tagIds },
              },
            },
          }
        : {}),
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
      instructor: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return courses;
}

export async function listCoursesByInstructor(instructorId: string) {
  return prisma.course.findMany({
    where: { instructorId },
    orderBy: { updatedAt: 'desc' },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });
}

export async function getCourseById(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      category: true,
      tags: { include: { tag: true } },
      instructor: true,
      sections: { include: { lessons: true }, orderBy: { order: 'asc' } },
    },
  });
}

export async function getCourseOutline(courseId: string) {
  return prisma.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      lessons: { orderBy: { order: 'asc' } },
    },
  });
}

export async function getFirstLessonId(courseId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { section: { courseId } },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true },
  });
  return lesson?.id ?? null;
}

export async function getLessonById(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: { include: { course: true } },
    },
  });
}
