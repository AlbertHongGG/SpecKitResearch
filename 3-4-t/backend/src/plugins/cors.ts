import type { FastifyPluginAsync } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = async (app) => {
  const allowedOrigins = app.config.CORS_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  await app.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });
};

export const corsPlugin = fp(plugin, { name: 'corsPlugin' });
