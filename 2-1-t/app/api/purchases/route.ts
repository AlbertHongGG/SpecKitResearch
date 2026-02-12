import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../src/server/db/prisma';
import { HttpError } from '../../../src/server/errors/errors';
import { withRouteHandler } from '../../../src/server/http/routeHandler';
import { requireAuth } from '../../../src/server/guards/auth';
import { purchaseRequestSchema } from '../../../src/shared/schema/api';

export const POST = withRouteHandler(async (req: NextRequest) => {
  const user = await requireAuth(req);

  const json = await req.json().catch(() => null);
  const parsed = purchaseRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '輸入格式錯誤',
      details: parsed.error.flatten(),
    });
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, status: true },
  });

  if (!course || course.status !== 'published') {
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '課程不可購買' });
  }

  try {
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        courseId: course.id,
      },
      select: { id: true, courseId: true, createdAt: true },
    });

    return NextResponse.json({ purchase });
  } catch (err) {
    // Unique constraint => already purchased
    throw new HttpError({ status: 400, code: 'BAD_REQUEST', message: '已購買此課程' });
  }
});
