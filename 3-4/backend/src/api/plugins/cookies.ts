import type { FastifyPluginAsync } from 'fastify';
import cookie from '@fastify/cookie';
import type { AppConfig } from '../../lib/config.js';
import fp from 'fastify-plugin';

const impl: FastifyPluginAsync<{ config: AppConfig }> = async (app, opts) => {
  await app.register(cookie, {
    secret: 'not-used',
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: opts.config.COOKIE_SECURE,
      path: '/',
    },
  });
};

export const cookiesPlugin = fp(impl);
