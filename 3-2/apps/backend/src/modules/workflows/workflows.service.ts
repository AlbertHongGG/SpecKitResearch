import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveWorkflow(projectId: string) {
    const wf = await this.prisma.workflow.findFirst({
      where: { projectId, isActive: true },
      include: {
        statuses: { orderBy: { position: 'asc' } },
        transitions: true,
      },
    });

    if (!wf) {
      throwNotFound();
    }

    return wf;
  }

  async getActiveWorkflowDto(projectId: string) {
    const wf = await this.getActiveWorkflow(projectId);
    const statusById = new Map(wf.statuses.map((s) => [s.id, s] as const));

    return {
      id: wf.id,
      projectId: wf.projectId,
      version: wf.version,
      isActive: wf.isActive,
      name: wf.name,
      statuses: wf.statuses.map((s) => ({ key: s.key, name: s.name, position: s.position })),
      transitions: wf.transitions
        .map((t) => ({
          fromStatusKey: statusById.get(t.fromStatusId)?.key,
          toStatusKey: statusById.get(t.toStatusId)?.key,
        }))
        .filter((t): t is { fromStatusKey: string; toStatusKey: string } => Boolean(t.fromStatusKey && t.toStatusKey)),
    };
  }

  async isTransitionAllowed(params: {
    workflowId: string;
    fromStatusId: string;
    toStatusId: string;
  }): Promise<boolean> {
    const t = await this.prisma.workflowTransition.findUnique({
      where: {
        workflowId_fromStatusId_toStatusId: {
          workflowId: params.workflowId,
          fromStatusId: params.fromStatusId,
          toStatusId: params.toStatusId,
        },
      },
      select: { id: true },
    });

    return Boolean(t);
  }

  async createNewVersion(params: {
    projectId: string;
    createdByUserId: string;
    name: string;
    statuses: Array<{ key: string; name: string; position: number }>;
    transitions: Array<{ fromStatusKey: string; toStatusKey: string }>;
  }) {
    return await this.prisma.$transaction(async (tx) => {
      const maxVersion = await tx.workflow.aggregate({
        where: { projectId: params.projectId },
        _max: { version: true },
      });
      const nextVersion = (maxVersion._max.version ?? 0) + 1;

      await tx.workflow.updateMany({
        where: { projectId: params.projectId, isActive: true },
        data: { isActive: false },
      });

      const wf = await tx.workflow.create({
        data: {
          projectId: params.projectId,
          name: params.name,
          version: nextVersion,
          isActive: true,
          createdByUserId: params.createdByUserId,
          statuses: {
            create: params.statuses.map((s) => ({ key: s.key, name: s.name, position: s.position })),
          },
        },
        include: { statuses: true },
      });

      const statusIdByKey = new Map(wf.statuses.map((s) => [s.key, s.id] as const));

      await tx.workflowTransition.createMany({
        data: params.transitions
          .map((t) => {
            const fromStatusId = statusIdByKey.get(t.fromStatusKey);
            const toStatusId = statusIdByKey.get(t.toStatusKey);
            if (!fromStatusId || !toStatusId) return null;
            return { workflowId: wf.id, fromStatusId, toStatusId };
          })
          .filter((x): x is { workflowId: string; fromStatusId: string; toStatusId: string } => Boolean(x)),
      });

      return wf;
    });
  }
}
