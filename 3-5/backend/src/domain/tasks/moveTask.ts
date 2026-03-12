import type { MembershipRole, Prisma, PrismaClient, Task } from '@prisma/client';

import { ConflictError, NotFoundError, ValidationError } from '../../api/httpErrors.js';
import { generateBetween } from '../ordering/position.js';
import { assertWipAllowsAdd, WipLimitError } from '../wip/wipPolicy.js';
import { assertNotArchived } from '../guards/archiveGuards.js';
import { sqliteRetry } from '../../db/sqliteRetry.js';

export type MoveTaskParams = {
    taskId: string;
    expectedVersion: number;
    toListId: string;
    beforeTaskId?: string | null;
    afterTaskId?: string | null;
    actorId: string;
    actorRole: MembershipRole;
    wipOverrideReason?: string | null;
};

export async function moveTaskWithRetry(params: {
    prisma: PrismaClient;
} & MoveTaskParams): Promise<{
    task: Task;
    authoritativeOrder: { listId: string; tasks: { taskId: string; position: string }[] };
}> {
    return sqliteRetry(() =>
        params.prisma.$transaction((tx) =>
            moveTask({
                tx,
                taskId: params.taskId,
                expectedVersion: params.expectedVersion,
                toListId: params.toListId,
                beforeTaskId: params.beforeTaskId,
                afterTaskId: params.afterTaskId,
                actorId: params.actorId,
                actorRole: params.actorRole,
                wipOverrideReason: params.wipOverrideReason,
            }),
        ),
    );
}

export async function moveTask(params: {
    tx: Prisma.TransactionClient;
    taskId: string;
    expectedVersion: number;
    toListId: string;
    beforeTaskId?: string | null;
    afterTaskId?: string | null;
    actorId: string;
    actorRole: MembershipRole;
    wipOverrideReason?: string | null;
}): Promise<{
    task: Task;
    authoritativeOrder: { listId: string; tasks: { taskId: string; position: string }[] };
}> {
    const task = await params.tx.task.findUnique({ where: { id: params.taskId } });
    if (!task) throw new NotFoundError('Task not found');

    assertNotArchived(task);

    const toList = await params.tx.list.findUnique({ where: { id: params.toListId } });
    if (!toList) throw new NotFoundError('List not found');
    assertNotArchived(toList);

    const toBoard = await params.tx.board.findUnique({ where: { id: toList.boardId } });
    if (!toBoard) throw new NotFoundError('Board not found');
    assertNotArchived(toBoard);

    if (toBoard.projectId !== task.projectId) {
        throw new ValidationError({ toListId: ['Target list must be in same project'] });
    }

    try {
        await assertWipAllowsAdd({
            tx: params.tx,
            listId: params.toListId,
            actorRole: params.actorRole,
            wipOverrideReason: params.wipOverrideReason,
            requireOverrideReason: true,
        });
    } catch (e) {
        if (e instanceof WipLimitError) {
            throw new ValidationError({ toListId: ['WIP limit exceeded'] });
        }
        throw e;
    }

    const nextTask = params.beforeTaskId
        ? await params.tx.task.findUnique({ where: { id: params.beforeTaskId } })
        : null;
    const prevTask = params.afterTaskId
        ? await params.tx.task.findUnique({ where: { id: params.afterTaskId } })
        : null;

    const nextPosition = nextTask && nextTask.listId === params.toListId ? nextTask.position : null;
    const prevPosition = prevTask && prevTask.listId === params.toListId ? prevTask.position : null;

    let prev = prevPosition;
    let next = nextPosition;

    if (!prev && next) {
        const immediatePrev = await params.tx.task.findFirst({
            where: { listId: params.toListId, position: { lt: next } },
            orderBy: [{ position: 'desc' }, { id: 'desc' }],
            select: { position: true },
        });
        prev = immediatePrev?.position ?? null;
    }

    if (prev && !next) {
        const immediateNext = await params.tx.task.findFirst({
            where: { listId: params.toListId, position: { gt: prev } },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: { position: true },
        });
        next = immediateNext?.position ?? null;
    }

    if (!prev && !next) {
        const last = await params.tx.task.findFirst({
            where: { listId: params.toListId },
            orderBy: [{ position: 'desc' }, { id: 'desc' }],
            select: { position: true },
        });
        prev = last?.position ?? null;
        next = null;
    }

    const newPosition = generateBetween(prev, next);

    const updated = await params.tx.task.updateMany({
        where: { id: params.taskId, version: params.expectedVersion },
        data: {
            version: { increment: 1 },
            listId: params.toListId,
            boardId: toList.boardId,
            position: newPosition,
        },
    });

    if (updated.count !== 1) {
        const latest = await params.tx.task.findUnique({ where: { id: params.taskId } });
        throw new ConflictError({ latest, message: 'Task version conflict' });
    }

    const moved = await params.tx.task.findUnique({ where: { id: params.taskId } });
    if (!moved) throw new NotFoundError('Task not found');

    const authoritative = await params.tx.task.findMany({
        where: { listId: params.toListId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, position: true },
    });

    await params.tx.activityLog.create({
        data: {
            projectId: task.projectId,
            actorId: params.actorId,
            entityType: 'task',
            entityId: task.id,
            action: 'move',
            metadata: {
                fromListId: task.listId,
                toListId: params.toListId,
                position: newPosition,
                wipOverrideReason: params.wipOverrideReason ?? null,
            },
        },
    });

    return {
        task: moved,
        authoritativeOrder: {
            listId: params.toListId,
            tasks: authoritative.map((t) => ({ taskId: t.id, position: t.position })),
        },
    };
}
