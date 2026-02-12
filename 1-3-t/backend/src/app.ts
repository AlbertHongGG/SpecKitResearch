import fastify from 'fastify';

import { loadEnv } from './config/env';
import { buildLogger } from './infra/logging/logger';
import { registerErrorHandler } from './api/http/errorHandler';
import { registerRequestId } from './api/http/requestId';
import { registerCors } from './api/plugins/cors';
import { registerCookies } from './api/plugins/cookies';
import { registerCsrf } from './api/plugins/csrf';
import { registerRateLimit } from './api/plugins/rateLimit';
import { registerSecurityHeaders } from './api/plugins/securityHeaders';
import { registerAuthContext } from './api/middleware/authContext';
import { registerRoutes } from './api/routes';

export async function buildApp() {
  const env = loadEnv();

  const app = fastify({
    logger: buildLogger(),
  });

  await registerRequestId(app);
  await registerErrorHandler(app);

  await registerSecurityHeaders(app);

  await registerCors(app, env);
  await registerCookies(app, env);
  await registerCsrf(app, env);
  await registerRateLimit(app);

  await registerAuthContext(app);
  await registerRoutes(app);

  return app;
}
