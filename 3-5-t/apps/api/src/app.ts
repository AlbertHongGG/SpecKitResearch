import Fastify, { type FastifyInstance } from 'fastify';
import './types/fastify';
import './types/prisma';
import type { AppConfig } from './config';
import { requestIdPlugin } from './plugins/request-id';
import { loggerPlugin } from './plugins/logger';
import { errorHandlerPlugin } from './plugins/error-handler';
import { securityHeadersPlugin } from './plugins/security-headers';
import { routesPlugin } from './routes';
import { createPrismaClient } from './db/prisma';
import { initSqlite } from './db/sqlite';
import cookie from '@fastify/cookie';
import { rateLimitPlugin } from './plugins/rate-limit';
import { enforceCsrf } from './http/security/csrf';
import { corsPlugin } from './plugins/cors';
import { createBroadcaster } from './realtime/broadcaster';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  app.decorate('config', config);
  app.decorate('broadcaster', createBroadcaster());

  const prisma = createPrismaClient(config.DATABASE_URL);
  await initSqlite(prisma);
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  // Apply internal plugins directly on the root instance so hooks/error-handling
  // propagate to routes registered in nested plugins (Fastify encapsulation).
  await requestIdPlugin(app as any, {} as any);
  await loggerPlugin(app as any, {} as any);
  await securityHeadersPlugin(app as any, {} as any);
  await corsPlugin(app as any, {} as any);
  await app.register(cookie, {
    secret: config.COOKIE_SECRET,
  });
  await rateLimitPlugin(app as any, {} as any);

  app.addHook('preHandler', async (req, reply) => {
    enforceCsrf(req, reply, config);
  });

  await errorHandlerPlugin(app as any, {} as any);
  await app.register(routesPlugin);

  return app;
}
