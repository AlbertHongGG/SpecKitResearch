import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';

import type { Env } from '../../config/env';

export async function registerCookies(app: FastifyInstance, env: Env) {
  await app.register(cookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
    parseOptions: {
      // allow parsing of RFC6265 cookies
    },
  });
}
