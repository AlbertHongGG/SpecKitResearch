import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../../src/server/errors/errors';
import { reorderRequestSchema } from '../../../../../../src/shared/schema/instructor';

function getSectionId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split('/').filter(Boolean);
  const sectionId = parts[parts.indexOf('sections') + 1];
  if (!sectionId) throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: 'sectionId required' });
  return sectionId;
}

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireRole(req, ['instructor', 'admin']);
  const sectionId = getSectionId(req);

  const json = await req.json().catch(() => null);
  const parsed = reorderRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, courseId: true } });
  if (!section) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });

  const course = await prisma.course.findUnique({ where: { id: section.courseId }, select: { instructorId: true, status: true } });
  if (!course) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到課程' });

  const isAuthor = user.id === course.instructorId;
  if (!(user.role === 'admin' || isAuthor)) {
    throw new HttpError({ status: 403, code: 'AUTH_FORBIDDEN', message: '權限不足' });
  }
  if (course.status === 'submitted') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '送審中不可編輯課綱' });
  }

  const sections = await prisma.section.findMany({
    where: { courseId: section.courseId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  const ids = sections.map((s) => s.id);
  const fromIdx = ids.indexOf(sectionId);
  if (fromIdx === -1) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到章節' });

  const toIdx = Math.max(0, Math.min(ids.length - 1, parsed.data.order - 1));
  ids.splice(fromIdx, 1);
  ids.splice(toIdx, 0, sectionId);

  await prisma.$transaction(
    ids.map((id, idx) => prisma.section.update({ where: { id }, data: { order: idx + 1 } }))
  );

  return NextResponse.json({ ok: true });
});
