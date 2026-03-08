import type { FastifyPluginAsync } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyCors, {
    origin: app.config.CORS_ORIGIN,
    credentials: true,
  });
};

export const corsPlugin = fp(plugin, { name: 'corsPlugin' });
