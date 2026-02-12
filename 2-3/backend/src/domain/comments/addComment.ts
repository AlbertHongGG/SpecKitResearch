import type { Prisma } from '@prisma/client';

import { NotFoundError } from '../../api/httpErrors.js';
import { assertNotArchived } from '../guards/archiveGuards.js';

export type CommentDto = {
    id: string;
    taskId: string;
    authorId: string;
    content: string;
    createdAt: string;
};

export type ActivityDto = {
    id: string;
    projectId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    timestamp: string;
    metadata: Record<string, unknown>;
};

export async function addComment(params: {
    tx: Prisma.TransactionClient;
    taskId: string;
    authorId: string;
    content: string;
}): Promise<{ projectId: string; comment: CommentDto; activity: ActivityDto }> {
    const task = await params.tx.task.findUnique({
        where: { id: params.taskId },
        select: { id: true, projectId: true, status: true },
    });
    if (!task) throw new NotFoundError('Task not found');
    assertNotArchived(task);

    const comment = await params.tx.comment.create({
        data: {
            taskId: params.taskId,
            authorId: params.authorId,
            content: params.content,
        },
    });

    const activity = await params.tx.activityLog.create({
        data: {
            projectId: task.projectId,
            actorId: params.authorId,
            entityType: 'comment',
            entityId: comment.id,
            action: 'create',
            metadata: { taskId: params.taskId },
        },
    });

    return {
        projectId: task.projectId,
        comment: {
            id: comment.id,
            taskId: comment.taskId,
            authorId: comment.authorId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
        },
        activity: {
            id: activity.id,
            projectId: activity.projectId,
            actorId: activity.actorId,
            entityType: activity.entityType,
            entityId: activity.entityId,
            action: activity.action,
            timestamp: activity.timestamp.toISOString(),
            metadata: (activity.metadata ?? {}) as Record<string, unknown>,
        },
    };
}
