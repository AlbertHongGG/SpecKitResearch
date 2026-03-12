import { prisma } from '../../db/prisma.js';
import { ForbiddenError, NotFoundError } from '../../api/httpErrors.js';
import { hasAtLeastRole, type ProjectRole } from './permissions.js';

export async function getProjectRoleOrThrow(params: {
    projectId: string;
    userId: string;
}): Promise<ProjectRole> {
    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new NotFoundError('Project not found');

    const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId: params.projectId, userId: params.userId } },
    });
    if (!membership) throw new ForbiddenError('Not a project member');

    return membership.role;
}

export async function assertProjectMember(params: { projectId: string; userId: string }): Promise<void> {
    await getProjectRoleOrThrow(params);
}

export async function getBoardAccessOrThrow(params: {
    boardId: string;
    userId: string;
    minRole?: ProjectRole;
}): Promise<{
    projectId: string;
    role: ProjectRole;
    board: { id: string; projectId: string; status: string };
}> {
    const board = await prisma.board.findUnique({
        where: { id: params.boardId },
        select: { id: true, projectId: true, status: true },
    });
    if (!board) throw new NotFoundError('Board not found');

    const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId: params.userId } },
    });
    if (!membership) throw new ForbiddenError('Not a project member');

    if (params.minRole && !hasAtLeastRole(membership.role, params.minRole)) {
        throw new ForbiddenError('Insufficient role');
    }

    return { projectId: board.projectId, role: membership.role, board };
}

export async function getListAccessOrThrow(params: {
    listId: string;
    userId: string;
    minRole?: ProjectRole;
}): Promise<{
    projectId: string;
    role: ProjectRole;
    list: { id: string; boardId: string; status: string };
    board: { id: string; projectId: string; status: string };
}> {
    const list = await prisma.list.findUnique({
        where: { id: params.listId },
        select: { id: true, boardId: true, status: true },
    });
    if (!list) throw new NotFoundError('List not found');

    const board = await prisma.board.findUnique({
        where: { id: list.boardId },
        select: { id: true, projectId: true, status: true },
    });
    if (!board) throw new NotFoundError('Board not found');

    const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId: params.userId } },
    });
    if (!membership) throw new ForbiddenError('Not a project member');

    if (params.minRole && !hasAtLeastRole(membership.role, params.minRole)) {
        throw new ForbiddenError('Insufficient role');
    }

    return { projectId: board.projectId, role: membership.role, list, board };
}

export async function getTaskAccessOrThrow(params: {
    taskId: string;
    userId: string;
    minRole?: ProjectRole;
}): Promise<{
    projectId: string;
    role: ProjectRole;
    task: { id: string; projectId: string; boardId: string; listId: string; status: string; version: number };
    list: { id: string; boardId: string; status: string };
    board: { id: string; projectId: string; status: string };
}> {
    const task = await prisma.task.findUnique({
        where: { id: params.taskId },
        select: { id: true, projectId: true, boardId: true, listId: true, status: true, version: true },
    });
    if (!task) throw new NotFoundError('Task not found');

    const list = await prisma.list.findUnique({
        where: { id: task.listId },
        select: { id: true, boardId: true, status: true },
    });
    if (!list) throw new NotFoundError('List not found');

    const board = await prisma.board.findUnique({
        where: { id: list.boardId },
        select: { id: true, projectId: true, status: true },
    });
    if (!board) throw new NotFoundError('Board not found');

    const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId: board.projectId, userId: params.userId } },
    });
    if (!membership) throw new ForbiddenError('Not a project member');

    if (params.minRole && !hasAtLeastRole(membership.role, params.minRole)) {
        throw new ForbiddenError('Insufficient role');
    }

    return { projectId: board.projectId, role: membership.role, task, list, board };
}
