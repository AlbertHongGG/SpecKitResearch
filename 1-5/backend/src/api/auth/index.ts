import type { FastifyInstance } from 'fastify';

import { registerLoginRoute } from './login.js';
import { registerMeRoute } from './me.js';
import { registerLogoutRoute } from './logout.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  await registerLoginRoute(app);
  await registerMeRoute(app);
  await registerLogoutRoute(app);
}
