import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import type { AppConfig } from '../../lib/config.js';
import fp from 'fastify-plugin';

const impl: FastifyPluginAsync<{ config: AppConfig }> = async (app, opts) => {
  const origins = opts.config.CORS_ORIGINS.split(',').map((s) => s.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!origins.includes(origin)) return cb(null, false);
      // With credentials, browsers require a concrete ACAO value (not '*').
      // Returning the origin string makes @fastify/cors echo it.
      return cb(null, origin);
    },
    credentials: true,
  });
};

export const corsPlugin = fp(impl);
