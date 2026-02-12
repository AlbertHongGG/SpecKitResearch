import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '../../../../../src/server/db/prisma';
import { withRouteHandler } from '../../../../../src/server/http/routeHandler';
import { requireRole } from '../../../../../src/server/guards/auth';
import { HttpError } from '../../../../../src/server/errors/errors';
import { adminUpsertTaxonomySchema } from '../../../../../src/shared/schema/admin';

export const GET = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ tags });
});

export const POST = withRouteHandler(async (req: NextRequest) => {
  await requireRole(req, ['admin']);

  const json = await req.json().catch(() => null);
  const parsed = adminUpsertTaxonomySchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '輸入格式錯誤', details: parsed.error.flatten() });
  }

  try {
    const tag = parsed.data.id
      ? await prisma.tag.update({
          where: { id: parsed.data.id },
          data: { name: parsed.data.name, isActive: parsed.data.isActive },
          select: { id: true, name: true, isActive: true },
        })
      : await prisma.tag.create({
          data: { name: parsed.data.name, isActive: parsed.data.isActive ?? true },
          select: { id: true, name: true, isActive: true },
        });

    return NextResponse.json({ tag });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError({ status: 400, code: 'VALIDATION_ERROR', message: '標籤名稱已存在' });
    }
    throw err;
  }
});
