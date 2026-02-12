import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { registerApiRoutes } from './api/routes.js';
import { registerRequestId } from './observability/requestId.js';
import { registerErrorHandler } from './observability/errors.js';
import { registerAuthentication } from './auth/authenticate.js';
import { registerCsrf } from './auth/csrf.js';
import { configureSqlitePragmas } from './db/sqlite.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
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
