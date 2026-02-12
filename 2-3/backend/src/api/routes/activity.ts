import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { getActivity } from '../../domain/activity/activityQuery.js';

const querySchema = z.object({
    cursor: z.string().optional(),
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : undefined))
        .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1 && v <= 200), {
            message: 'limit must be 1..200',
        }),
});

export const activityRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        '/projects/:projectId/activity',
        { preHandler: [requireAuth, requireProjectRole('viewer')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const { cursor, limit } = app.validate(querySchema, request.query);
            return getActivity({ projectId, cursor, limit: limit ?? 50 });
        },
    );
};

export default activityRoutes;
