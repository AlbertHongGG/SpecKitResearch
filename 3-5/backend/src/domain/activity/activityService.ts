import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export async function appendActivity(params: {
    projectId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Prisma.JsonObject;
}) {
    return prisma.activityLog.create({
        data: {
            projectId: params.projectId,
            actorId: params.actorId,
            entityType: params.entityType,
            entityId: params.entityId,
            action: params.action,
            metadata: params.metadata ?? undefined,
        },
    });
}
