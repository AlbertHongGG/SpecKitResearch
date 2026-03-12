import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';

export const corsPlugin: FastifyPluginAsync = async (app) => {
  const allowedOrigins = new Set([
    app.config.WEB_ORIGIN,
    ...(app.config.WEB_ORIGINS ?? []),
    'http://localhost:5173',
    'http://localhost:5174',
  ]);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser tools (no Origin) and configured web origins.
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.has(origin));
    },
    credentials: true,
  });
};
