import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getTaskAccessOrThrow } from '../../domain/rbac/projectAccess.js';
import { ValidationError } from '../httpErrors.js';
import { assertNotArchived } from '../../domain/guards/archiveGuards.js';
import { addComment } from '../../domain/comments/addComment.js';
import { publish } from '../../realtime/publish.js';
import { sanitizePlainText } from '../../domain/safety/sanitize.js';

const postSchema = z.object({
    content: z.string().min(1).max(5000),
});

export const commentsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/tasks/:taskId/comments', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'viewer' });
        assertNotArchived(access.board);
        assertNotArchived(access.list);

        const comments = await prisma.comment.findMany({
            where: { taskId },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        return {
            comments: comments.map((c) => ({
                id: c.id,
                taskId: c.taskId,
                authorId: c.authorId,
                content: c.content,
                createdAt: c.createdAt.toISOString(),
            })),
        };
    });

    app.post('/tasks/:taskId/comments', { preHandler: [requireAuth] }, async (request, reply) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const body = app.validate(postSchema, request.body);

        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'member' });
        assertNotArchived(access.board);
        assertNotArchived(access.list);
        assertNotArchived(access.task);

        const content = sanitizePlainText(body.content, 5000);
        if (!content) throw new ValidationError({ content: ['Content is required'] });

        const result = await prisma.$transaction((tx) =>
            addComment({ tx, taskId, authorId: request.user!.id, content }),
        );

        publish(result.projectId, 'CommentAdded', { comment: result.comment });
        publish(result.projectId, 'ActivityAppended', { event: result.activity });

        reply.status(201).send(result.comment);
    });
};

export default commentsRoutes;
