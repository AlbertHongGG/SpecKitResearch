import type { Prisma } from '@prisma/client';

import { prisma } from '@/db/prisma';

export async function listInstructorCourses(instructorId: string) {
  return prisma.course.findMany({
    where: { instructorId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createDraftCourse(input: {
  instructorId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  coverFileId?: string | null;
  tagIds?: string[];
}) {
  return prisma.course.create({
    data: {
      instructorId: input.instructorId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      price: input.price,
      coverFileId: input.coverFileId ?? null,
      status: 'draft',
      tags: input.tagIds?.length ? { create: input.tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });
}

export async function updateCourseBasics(courseId: string, input: {
  categoryId?: string;
  title?: string;
  description?: string;
  price?: number;
  coverFileId?: string | null;
  tagIds?: string[];
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const course = await tx.course.update({
      where: { id: courseId },
      data: {
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        price: input.price,
        coverFileId: input.coverFileId,
      },
    });

    if (input.tagIds) {
      await tx.courseTag.deleteMany({ where: { courseId } });
      if (input.tagIds.length) {
        await tx.courseTag.createMany({
          data: input.tagIds.map((tagId) => ({ courseId, tagId })),
        });
      }
    }

    return course;
  });
}

export async function setCourseStatus(courseId: string, status: string, data?: { rejectedReason?: string | null }) {
  return prisma.course.update({
    where: { id: courseId },
    data: {
      status,
      rejectedReason: data?.rejectedReason ?? undefined,
      publishedAt: status === 'published' ? new Date() : undefined,
      archivedAt: status === 'archived' ? new Date() : undefined,
    },
  });
}

export async function createSection(courseId: string, input: { title: string; order: number }) {
  return prisma.section.create({
    data: {
      courseId,
      title: input.title,
      order: input.order,
    },
  });
}

export async function updateSection(sectionId: string, input: { title?: string; order?: number }) {
  return prisma.section.update({
    where: { id: sectionId },
    data: input,
  });
}

export async function deleteSection(sectionId: string) {
  return prisma.section.delete({ where: { id: sectionId } });
}

export async function createLesson(sectionId: string, input: {
  title: string;
  order: number;
  contentType: string;
  contentText?: string | null;
  contentImageFileId?: string | null;
  contentPdfFileId?: string | null;
}) {
  return prisma.lesson.create({
    data: {
      sectionId,
      title: input.title,
      order: input.order,
      contentType: input.contentType,
      contentText: input.contentText ?? null,
      contentImageFileId: input.contentImageFileId ?? null,
      contentPdfFileId: input.contentPdfFileId ?? null,
    },
  });
}

export async function updateLesson(lessonId: string, input: {
  title?: string;
  order?: number;
  contentType?: string;
  contentText?: string | null;
  contentImageFileId?: string | null;
  contentPdfFileId?: string | null;
}) {
  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: input.title,
      order: input.order,
      contentType: input.contentType,
      contentText: input.contentText,
      contentImageFileId: input.contentImageFileId,
      contentPdfFileId: input.contentPdfFileId,
    },
  });
}

export async function deleteLesson(lessonId: string) {
  return prisma.lesson.delete({ where: { id: lessonId } });
}
