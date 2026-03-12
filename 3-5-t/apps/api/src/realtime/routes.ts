import type { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { requireAuth } from '../http/auth/require-auth';
import { realtimeWsHandler } from './handler';

export const realtimeRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket);

  app.get(
    '/realtime',
    {
      websocket: true,
      preHandler: [requireAuth],
    },
    (conn, req) => {
      void realtimeWsHandler(app, conn, req);
    }
  );
};
