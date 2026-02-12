import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { config } from './lib/config.js';
import { getCorsOptions } from './lib/cors.js';
import { genReqId, registerRequestIdPropagation } from './lib/requestId.js';
import { registerErrorHandler } from './lib/errorHandler.js';
import { registerLogger } from './lib/logger.js';
import { initSqlitePragmas } from './repo/prisma.js';
import { registerApiRoutes } from './api/index.js';

export async function buildServer() {
  const app = Fastify({
    logger: true,
    genReqId,
  });

  await initSqlitePragmas();

  await app.register(cors, getCorsOptions());
  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  await registerRequestIdPropagation(app);
  registerLogger(app);
  await registerErrorHandler(app);

  await registerApiRoutes(app);

  app.get('/healthz', async () => ({ ok: true }));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();

  await app.listen({
    port: config.PORT,
    host: '0.0.0.0',
  });
}
