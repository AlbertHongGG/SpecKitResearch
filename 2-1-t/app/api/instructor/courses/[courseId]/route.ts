import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../src/server/errors/errors';
import { updateCourseRequestSchema } from '../../../../../src/shared/schema/instructor';

function getCourseId(req: NextRequest) {
  const courseId = req.nextUrl.pathname.split('/').filter(Boolean).pop();
  if (!courseId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  return courseId;
}

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const courseId = getCourseId(req);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      instructorId: true,
      title: true,
      description: true,
      price: true,
      coverImageUrl: true,
      status: true,
      rejectedReason: true,
      category: { select: { id: true, name: true, isActive: true } },
      courseTags: { select: { tag: { select: { id: true, name: true, isActive: true } } } },
    },
  });

  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = user.id === course.instructorId;
  if (!(user.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      coverImageUrl: course.coverImageUrl,
      status: course.status,
      rejectedReason: course.rejectedReason,
      category: { id: course.category.id, name: course.category.name },
      tags: course.courseTags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name })),
    },
  });
});

export const PATCH = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const courseId = getCourseId(req);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true },
  });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = user.id === course.instructorId;
  if (!(user.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }

  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯' });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateCourseRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const { title, description, price, categoryId, tagIds, coverImageUrl } = parsed.data;

  if (categoryId) {
    const category = await prisma.courseCategory.findUnique({ where: { id: categoryId }, select: { isActive: true } });
    if (!category || !category.isActive) {
      throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '分類不可用' });
    }
  }

  if (tagIds) {
    if (tagIds.length > 0) {
      const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, isActive: true } });
      const activeIds = new Set(tags.filter((t) => t.isActive).map((t) => t.id));
      if (activeIds.size !== tagIds.length) {
        throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '標籤不可用' });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: {
        title,
        description,
        price,
        categoryId,
        coverImageUrl,
      },
    });

    if (tagIds) {
      await tx.courseTag.deleteMany({ where: { courseId } });
      if (tagIds.length > 0) {
        await tx.courseTag.createMany({
          data: tagIds.map((tagId) => ({ courseId, tagId })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
});
