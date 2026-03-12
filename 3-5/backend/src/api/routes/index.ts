import type { FastifyPluginAsync } from 'fastify';

import authRoutes from './auth.js';
import projectsRoutes from './projects.js';
import boardsRoutes from './boards.js';
import listsRoutes from './lists.js';
import tasksRoutes from './tasks.js';
import snapshotRoutes from './snapshot.js';
import activityRoutes from './activity.js';
import membershipRoutes from './membership.js';
import commentsRoutes from './comments.js';
import { sseRoutePlugin } from '../../realtime/sseRoute.js';

export const routesPlugin: FastifyPluginAsync = async (app) => {
    app.get('/healthz', async () => ({ ok: true }));

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(projectsRoutes);
    await app.register(boardsRoutes);
    await app.register(listsRoutes);
    await app.register(tasksRoutes);
    await app.register(snapshotRoutes);
    await app.register(activityRoutes);
    await app.register(membershipRoutes);
    await app.register(commentsRoutes);
    await app.register(sseRoutePlugin);
};

export default routesPlugin;
