import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../src/server/guards/auth';
import { HttpError } from '../../../../src/server/errors/errors';
import { adminUpdateUserSchema } from '../../../../src/shared/schema/admin';

export const GET = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
});

export const PATCH = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const json = await req.json().catch(() => null);
  const parsed = adminUpdateUserSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
  if (!user) throw new HttpError({ status: 404, code: 'NOT_FOUND', message: '找不到使用者' });

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ ok: true });
});
