import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig } from '../lib/config.js';
import { requestIdPlugin } from './plugins/requestId.js';
import { cookiesPlugin } from './plugins/cookies.js';
import { corsPlugin } from './plugins/cors.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';
import { csrfPlugin } from './plugins/csrf.js';
import { authzPlugin } from './plugins/authz.js';

import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { ordersRoutes } from './routes/orders.js';
import { payRoutes } from './routes/pay.js';
import { returnsRoutes } from './routes/returns.js';
import { adminRoutes } from './routes/admin.js';
import { webhookEndpointsRoutes } from './routes/webhookEndpoints.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

  await app.register(requestIdPlugin);
  await app.register(cookiesPlugin, { config });
  await app.register(corsPlugin, { config });
  await app.register(errorHandlerPlugin);

  // CSRF before routes; authz will attach user for protected routes.
  await app.register(csrfPlugin, { config });
  await app.register(authzPlugin);

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(catalogRoutes, { prefix: '/api' });
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(payRoutes, { prefix: '/api/pay' });
  await app.register(returnsRoutes, { prefix: '/api/returns' });
  await app.register(webhookEndpointsRoutes, { prefix: '/api/webhook-endpoints' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
