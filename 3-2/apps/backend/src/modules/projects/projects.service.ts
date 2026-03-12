import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit: unknown) {
    const n = typeof limit === 'string' ? Number(limit) : typeof limit === 'number' ? limit : 50;
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(100, Math.floor(n));
  }

  async listProjectsForOrg(params: {
    orgId: string;
    userId: string;
    limit?: string;
    cursor?: string;
  }) {
    const take = this.normalizeLimit(params.limit);

    const rows = await this.prisma.project.findMany({
      where: {
        organizationId: params.orgId,
        memberships: { some: { userId: params.userId } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(params.cursor
        ? {
            cursor: { id: params.cursor },
            skip: 1,
          }
        : {}),
      select: { id: true, key: true, name: true, type: true, status: true },
    });

    const nextCursor = rows.length > take ? rows[rows.length - 1]!.id : null;
    const page = rows.slice(0, take);

    return {
      projects: page,
      nextCursor,
    };
  }

  async createProject(params: {
    orgId: string;
    actorUserId: string;
    key: string;
    name: string;
    type: 'scrum' | 'kanban';
  }) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            organizationId: params.orgId,
            key: params.key,
            name: params.name,
            type: params.type,
            status: 'active',
            createdByUserId: params.actorUserId,
            memberships: {
              create: {
                userId: params.actorUserId,
                projectRole: 'project_manager',
              },
            },
            issueCounter: {
              create: { nextNumber: 0 },
            },
            issueTypes: {
              create: [
                { type: 'story', isEnabled: true },
                { type: 'task', isEnabled: true },
                { type: 'bug', isEnabled: true },
                { type: 'epic', isEnabled: true },
              ],
            },
          },
        });

        const workflow = await tx.workflow.create({
          data: {
            projectId: project.id,
            name: 'Default',
            version: 1,
            isActive: true,
            createdByUserId: params.actorUserId,
            statuses: {
              create: [
                { key: 'todo', name: 'To Do', position: 1 },
                { key: 'in_progress', name: 'In Progress', position: 2 },
                { key: 'done', name: 'Done', position: 3 },
              ],
            },
          },
        });

        const statuses = await tx.workflowStatus.findMany({ where: { workflowId: workflow.id } });
        const byKey = Object.fromEntries(statuses.map((s) => [s.key, s] as const));
        const todo = byKey.todo;
        const inProgress = byKey.in_progress;
        const done = byKey.done;
        if (!todo || !inProgress || !done) {
          throw new Error('Default workflow statuses missing');
        }

        await tx.workflowTransition.createMany({
          data: [
            { workflowId: workflow.id, fromStatusId: todo.id, toStatusId: inProgress.id },
            { workflowId: workflow.id, fromStatusId: inProgress.id, toStatusId: done.id },
            { workflowId: workflow.id, fromStatusId: todo.id, toStatusId: done.id },
          ],
        });

        return project;
      });

      return created;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Project key already exists in this organization',
        });
      }
      throw err;
    }
  }
}
