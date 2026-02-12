import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { createSectionRequestSchema } from '../../../../../../src/shared/schema/instructor';

function getCourseId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const courseId = parts[parts.indexOf('courses') + 1];
  if (!courseId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  return courseId;
}

async function assertCanEditCourse(params: { courseId: string; userId: string; role: string }) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, instructorId: true, status: true },
  });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });
  const isAuthor = params.userId === course.instructorId;
  if (!(params.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }
  return course;
}

async function assertCanMutateCourse(params: { courseId: string; userId: string; role: string }) {
  const course = await assertCanEditCourse(params);
  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }
  return course;
}

export const GET = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const courseId = getCourseId(req);

  await assertCanEditCourse({ courseId, userId: user.id, role: user.role });

  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          contentType: true,
          contentText: true,
          contentFileId: true,
          contentFileName: true,
        },
      },
    },
  });

  return NextResponse.json({
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        contentType: l.contentType,
        contentText: l.contentType === 'text' ? l.contentText : null,
        contentFileId: l.contentType === 'text' ? null : l.contentFileId,
        contentFileName: l.contentType === 'pdf' ? l.contentFileName : null,
      })),
    })),
  });
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const courseId = getCourseId(req);

  await assertCanMutateCourse({ courseId, userId: user.id, role: user.role });

  const json = await req.json().catch(() => null);
  const parsed = createSectionRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const max = await prisma.section.aggregate({ where: { courseId }, _max: { order: true } });
  const nextOrder = (max._max.order ?? 0) + 1;

  const section = await prisma.section.create({
    data: { courseId, title: parsed.data.title, order: nextOrder },
    select: { id: true, title: true, order: true },
  });

  return NextResponse.json({ section }, { status: 201 });
});
