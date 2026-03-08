import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { loadEnv } from './config/env';
import { requestIdPlugin } from './plugins/request_id';
import { errorHandlerPlugin } from './plugins/error_handler';
import { prismaPlugin } from './plugins/prisma';
import { sessionAuthPlugin } from './plugins/session_auth';
import { corsPlugin } from './plugins/cors';
import { securityHeadersPlugin } from './plugins/security_headers';
import { rateLimitPlugin } from './plugins/rate_limit';
import { csrfMiddleware } from './middleware/csrf';
import { authRoutes } from './api/routes/auth';
import { ordersRoutes } from './api/routes/orders';
import { payRoutes } from './api/routes/pay';
import { webhookRoutes } from './api/routes/webhook';
import { replayRoutes } from './api/routes/replay';
import { adminPaymentMethodsRoutes } from './api/routes/admin_payment_methods';
import { adminScenarioTemplatesRoutes } from './api/routes/admin_scenario_templates';
import { adminSettingsRoutes } from './api/routes/admin_settings';

export async function buildApp() {
  const env = loadEnv(process.env);

  const app = Fastify({
    logger: true,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  });

  app.decorate('config', env);

  await app.register(corsPlugin);
  await app.register(securityHeadersPlugin);

  await app.register(cookie, {
    secret: env.COOKIE_SIGNING_SECRET,
    hook: 'onRequest',
  });

  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin, { databaseUrl: env.DATABASE_URL });
  await app.register(sessionAuthPlugin, {
    cookieName: env.SESSION_COOKIE_NAME,
    sessionTtlSec: env.SESSION_TTL_SEC,
    nodeEnv: env.NODE_ENV,
  });
  await app.register(rateLimitPlugin);

  app.addHook('preHandler', csrfMiddleware(env));

  app.get('/api/health', async (request) => {
    return { ok: true, data: { status: 'ok' }, requestId: request.id };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(webhookRoutes, { prefix: '/api/orders' });
  await app.register(replayRoutes, { prefix: '/api/orders' });
  await app.register(payRoutes, { prefix: '/api/pay' });
  await app.register(adminPaymentMethodsRoutes, { prefix: '/api/admin' });
  await app.register(adminScenarioTemplatesRoutes, { prefix: '/api/admin' });
  await app.register(adminSettingsRoutes, { prefix: '/api/admin' });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: ReturnType<typeof loadEnv>;
  }
}

