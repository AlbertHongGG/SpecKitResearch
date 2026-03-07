import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerApiRoutes } from './api/routes.js';
import { registerRequestId } from './observability/requestId.js';
import { registerErrorHandler } from './observability/errors.js';
import { registerAuthentication } from './auth/authenticate.js';
import { registerCsrf } from './auth/csrf.js';
import { configureSqlitePragmas } from './db/sqlite.js';

export async function buildApp() {
  const allowedOrigins = new Set(['http://localhost:5173', 'http://localhost:5174']);

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed'), false);
    },
  });

  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  registerRequestId(app);
  registerAuthentication(app);
  registerCsrf(app);
  registerErrorHandler(app);

  app.setNotFoundHandler(async (request, reply) => {
    const requestId = (request as any).requestId ?? 'unknown';
    return reply.status(404).send({
      error: { code: 'NotFound', message: 'Not found', requestId },
    });
  });

  await app.register(async (instance) => {
    await registerApiRoutes(instance);
  });

  app.addHook('onReady', async () => {
    await configureSqlitePragmas();
  });

  return app;
}
