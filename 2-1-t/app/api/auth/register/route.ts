import { NextResponse, type NextRequest } from 'next/server';

import { registerRequestSchema } from '../../../../src/shared/schema/auth';
import { prisma } from '../../../../src/server/db/prisma';
import { HttpError } from '../../../../src/server/errors/errors';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { hashPassword } from '../../../../src/server/auth/password';

export const POST = withRouteHandler(async (req: NextRequest) => {
  const json = await req.json().catch(() => null);
  const parsed = registerRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '輸入格式錯誤',
      details: parsed.error.flatten(),
    });
  }

  const { email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new HttpError({ status: 400, code: 'CONFLICT', message: 'Email 已被使用' });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      isActive: true,
    },
    select: { id: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json({ user });
});
