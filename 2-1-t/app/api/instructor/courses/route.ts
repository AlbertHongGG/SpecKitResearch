import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../src/server/guards/auth';
import { HttpError } from '../../../../src/server/errors/errors';
import { createCourseDraftRequestSchema } from '../../../../src/shared/schema/instructor';

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);

  const where = user.role === 'admin' ? {} : { instructorId: user.id };

  const courses = await prisma.course.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      price: c.price,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      category: c.category,
    })),
  });
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);

  const json = await req.json().catch(() => null);
  const parsed = createCourseDraftRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '輸入格式錯誤',
      details: parsed.error.flatten(),
    });
  }

  const { title, description, price, categoryId, tagIds, coverImageUrl } = parsed.data;

  const category = await prisma.courseCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true },
  });
  if (!category || !category.isActive) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '分類不可用' });
  }

  if (tagIds.length > 0) {
    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, isActive: true } });
    const activeIds = new Set(tags.filter((t) => t.isActive).map((t) => t.id));
    if (activeIds.size !== tagIds.length) {
      throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '標籤不可用' });
    }
  }

  const course = await prisma.course.create({
    data: {
      instructorId: user.role === 'admin' ? user.id : user.id,
      categoryId,
      title,
      description,
      price,
      coverImageUrl: coverImageUrl ?? null,
      status: 'draft',
      courseTags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ course: { id: course.id } }, { status: 201 });
});
