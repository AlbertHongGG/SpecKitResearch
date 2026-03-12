import { prisma } from '../../db/prisma.js';
import { NotFoundError } from '../../api/httpErrors.js';
import { latestEventId } from '../../realtime/bus.js';

export async function buildSnapshot(params: { projectId: string; boardId?: string | null }) {
    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new NotFoundError('Project not found');

    const boards = await prisma.board.findMany({
        where: { projectId: params.projectId, ...(params.boardId ? { id: params.boardId } : {}) },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const boardIds = boards.map((b) => b.id);

    const lists = await prisma.list.findMany({
        where: { boardId: { in: boardIds } },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const listIds = lists.map((l) => l.id);

    const tasks = await prisma.task.findMany({
        where: { listId: { in: listIds } },
        orderBy: [{ listId: 'asc' }, { position: 'asc' }, { id: 'asc' }],
        include: { assignees: true },
    });

    const memberships = await prisma.projectMembership.findMany({
        where: { projectId: params.projectId },
        orderBy: [{ joinedAt: 'asc' }],
    });

    return {
        snapshotGeneratedAt: new Date().toISOString(),
        latestEventId: latestEventId(params.projectId),
        project,
        boards,
        lists,
        tasks: tasks.map((t) => ({
            ...t,
            assigneeIds: t.assignees.map((a) => a.userId),
        })),
        memberships,
    };
}
