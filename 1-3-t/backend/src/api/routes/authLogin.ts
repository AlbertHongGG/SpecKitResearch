import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { loadEnv } from '../../config/env';
import { AppError } from '../http/errors';
import { prisma } from '../../infra/db/prisma';
import { verifyPassword } from '../../infra/auth/password';

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

export async function registerAuthLoginRoute(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = BodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, email: true, passwordHash: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      throw new AppError({
        code: 'AUTH_REQUIRED',
        status: 401,
        message: 'Email 或密碼錯誤',
      });
    }

    const ok = await verifyPassword({ password: body.password, passwordHash: user.passwordHash });
    if (!ok) {
      throw new AppError({
        code: 'AUTH_REQUIRED',
        status: 401,
        message: 'Email 或密碼錯誤',
      });
    }

    const env = loadEnv();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });

    setSessionCookie(reply, session.id);

    reply.status(200).send({
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
