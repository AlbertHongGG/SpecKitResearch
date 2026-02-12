import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';

export const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser tools (no Origin) and the configured web origin.
      if (!origin) return cb(null, true);
      cb(null, origin === app.config.WEB_ORIGIN);
    },
    credentials: true,
  });
};
