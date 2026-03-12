import type { FastifyPluginAsync } from 'fastify';
import { ACCESS_COOKIE } from '../http/auth/cookies';
import { decodeAccessPayload, getSignedCookie, isAccessExpired } from '../http/auth/access';
import { authRoutes } from './auth';
import { boardsRoutes } from './boards';
import { invitationsRoutes } from './invitations';
import { listsRoutes } from './lists';
import { membershipsRoutes } from './memberships';
import { projectsRoutes } from './projects';
import { snapshotRoutes } from './snapshot';
import { tasksRoutes } from './tasks';
import { commentsRoutes } from './comments';
import { activityRoutes } from './activity';
import { realtimeRoutes } from '../realtime/routes';

export const routesPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req) => {
    const raw = getSignedCookie(req, ACCESS_COOKIE);
    if (!raw) return;

    try {
      const payload = decodeAccessPayload(raw);
      if (isAccessExpired(payload)) return;
      (req as any).user = {
        id: payload.userId,
        email: payload.email,
        displayName: payload.displayName,
      };
    } catch {
      // ignore invalid cookie
    }
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(projectsRoutes);
  await app.register(invitationsRoutes);
  await app.register(membershipsRoutes);
  await app.register(boardsRoutes);
  await app.register(listsRoutes);
  await app.register(snapshotRoutes);
  await app.register(tasksRoutes);
  await app.register(commentsRoutes);
  await app.register(activityRoutes);
  await app.register(realtimeRoutes);
};
