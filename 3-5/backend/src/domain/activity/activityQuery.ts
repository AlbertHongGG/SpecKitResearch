import { prisma } from '../../db/prisma.js';

export async function getActivity(params: {
    projectId: string;
    limit: number;
    cursor?: string;
}): Promise<{ events: unknown[]; nextCursor: string | null }> {
    const take = Math.max(1, Math.min(params.limit, 200));

    const events = await prisma.activityLog.findMany({
        where: { projectId: params.projectId },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(params.cursor
            ? {
                cursor: { id: params.cursor },
                skip: 1,
            }
            : {}),
    });

    const page = events.slice(0, take);
    const nextCursor = events.length > take ? page.at(-1)?.id ?? null : null;

    return {
        events: page.map((e) => ({
            id: e.id,
            projectId: e.projectId,
            actorId: e.actorId,
            entityType: e.entityType,
            entityId: e.entityId,
            action: e.action,
            timestamp: e.timestamp.toISOString(),
            metadata: e.metadata ?? {},
        })),
        nextCursor,
    };
}
