import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../../src/server/errors/errors';
import { updateSectionRequestSchema } from '../../../../../../../src/shared/schema/instructor';

function getParams(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const courseId = parts[parts.indexOf('courses') + 1];
  const sectionId = parts[parts.indexOf('sections') + 1];
  if (!courseId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'courseId required' });
  if (!sectionId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'sectionId required' });
  return { courseId, sectionId };
}

async function assertCanAccessCourse(params: { courseId: string; userId: string; role: string }) {
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
  const course = await assertCanAccessCourse(params);
  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }
  return course;
}

async function resequenceSections(courseId: string) {
  const sections = await prisma.section.findMany({ where: { courseId }, orderBy: { order: 'asc' }, select: { id: true } });
  await prisma.$transaction(
    sections.map((s, idx) => prisma.section.update({ where: { id: s.id }, data: { order: idx + 1 } }))
  );
}

export const PATCH = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const { courseId, sectionId } = getParams(req);

  await assertCanMutateCourse({ courseId, userId: user.id, role: user.role });

  const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, courseId: true } });
  if (!section || section.courseId !== courseId) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSectionRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  await prisma.section.update({ where: { id: sectionId }, data: { title: parsed.data.title } });
  return NextResponse.json({ ok: true });
});

export const DELETE = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const { courseId, sectionId } = getParams(req);

  await assertCanMutateCourse({ courseId, userId: user.id, role: user.role });

  const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, courseId: true } });
  if (!section || section.courseId !== courseId) {
    throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });
  }

  await prisma.section.delete({ where: { id: sectionId } });
  await resequenceSections(courseId);

  return NextResponse.json({ ok: true });
});
