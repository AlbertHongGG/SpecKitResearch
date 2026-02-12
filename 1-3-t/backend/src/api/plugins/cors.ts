import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

import type { Env } from '../../config/env';

export async function registerCors(app: FastifyInstance, env: Env) {
  await app.register(cors, {
    origin: (origin, cb) => {
      // non-browser clients may not send Origin
      if (!origin) return cb(null, true);

      const allowed = origin === env.APP_ORIGIN;
      cb(allowed ? null : new Error('CORS blocked'), allowed);
    },
    credentials: true,
  });
}
