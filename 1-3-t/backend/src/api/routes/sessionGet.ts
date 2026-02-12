import type { FastifyInstance } from 'fastify';

import { AppError } from '../http/errors';

export async function registerSessionGetRoute(app: FastifyInstance) {
  app.get('/session', async (request) => {
    if (!request.auth || !request.auth.user) {
      throw new AppError({
        code: 'AUTH_REQUIRED',
        status: 401,
        message: '請先登入',
      });
    }

    const user = request.auth.user;

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  });
}
