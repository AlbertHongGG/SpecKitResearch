import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { loadEnv } from '../../config/env';
import { AppError } from '../http/errors';
import { hashPassword } from '../../infra/auth/password';
import { prisma } from '../../infra/db/prisma';

const BodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '密碼確認不一致',
    path: ['passwordConfirm'],
  });

const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' }> = [
  { name: '食物', type: 'expense' },
  { name: '生活', type: 'expense' },
  { name: '交通', type: 'expense' },
  { name: '薪水', type: 'income' },
  { name: '提款', type: 'income' },
];

function setSessionCookie(reply: FastifyReply, sid: string) {
  const env = loadEnv();
  reply.setCookie('sid', sid, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function registerAuthRegisterRoute(app: FastifyInstance) {
  app.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = BodySchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new AppError({
        code: 'EMAIL_IN_USE',
        status: 409,
        message: 'Email 已被使用',
      });
    }

    const passwordHash = await hashPassword(body.password);
    const env = loadEnv();

    const { user, session } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, passwordHash },
        select: { id: true, email: true, createdAt: true, updatedAt: true },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId: user.id,
          name: c.name,
          type: c.type,
          isActive: true,
          isDefault: true,
        })),
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      });

      return { user, session };
    });

    setSessionCookie(reply, session.id);

    reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
    },
  );
}
