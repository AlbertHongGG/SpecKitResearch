import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../middleware/requireAuth.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { buildSnapshot } from '../../domain/snapshot/snapshotService.js';

export const snapshotRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        '/projects/:projectId/snapshot',
        { preHandler: [requireAuth, requireProjectRole('viewer')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            return buildSnapshot({ projectId });
        },
    );
};

export default snapshotRoutes;
