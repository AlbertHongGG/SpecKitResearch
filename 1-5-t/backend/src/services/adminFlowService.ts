import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { ApiError } from '../observability/errors.js';
import type { SessionUser } from '../auth/session.js';
import { auditEvents } from './auditEvents.js';

export type FlowStepInput = {
  stepKey: string;
  orderIndex: number;
  mode: 'Serial' | 'Parallel';
  assigneeIds: string[];
};

export const adminFlowService = {
  async listTemplates() {
    const templates = await prisma.approvalFlowTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          include: {
            assignees: true,
          },
        },
      },
    });
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      updatedAt: t.updatedAt,
      steps: t.steps.map((s) => ({
        stepKey: s.stepKey,
        orderIndex: s.orderIndex,
        mode: s.mode,
        assigneeIds: s.assignees.map((a) => a.assigneeId),
      })),
    }));
  },

  validateCompleteness(steps: FlowStepInput[]) {
    if (!steps || steps.length < 1) {
      throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Template must have steps' });
    }
    const seen = new Set<string>();
    for (const step of steps) {
      if (!step.stepKey || step.stepKey.length > 64) {
        throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Invalid stepKey' });
      }
      if (seen.has(step.stepKey)) {
        throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Duplicate stepKey' });
      }
      seen.add(step.stepKey);

      if (!Array.isArray(step.assigneeIds) || step.assigneeIds.length < 1) {
        throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Step must have assignees' });
      }
      if (step.mode === 'Serial' && step.assigneeIds.length !== 1) {
        throw new ApiError({
          statusCode: 400,
          code: 'ValidationError',
          message: 'Serial step must have exactly 1 assignee',
        });
      }
    }
  },

  async upsertTemplate(params: {
    user: SessionUser;
    templateId?: string;
    name: string;
    isActive: boolean;
    steps: FlowStepInput[];
  }) {
    if (params.user.role !== 'Admin') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }
    this.validateCompleteness(params.steps);

    const template = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const t = params.templateId
        ? await tx.approvalFlowTemplate.update({
            where: { id: params.templateId },
            data: { name: params.name, isActive: params.isActive },
          })
        : await tx.approvalFlowTemplate.create({
            data: { name: params.name, isActive: params.isActive },
          });

      // Replace steps/assignees
      await tx.approvalFlowStepAssignee.deleteMany({ where: { step: { templateId: t.id } } });
      await tx.approvalFlowStep.deleteMany({ where: { templateId: t.id } });

      for (const step of params.steps.sort((a, b) => a.orderIndex - b.orderIndex)) {
        const createdStep = await tx.approvalFlowStep.create({
          data: { templateId: t.id, stepKey: step.stepKey, orderIndex: step.orderIndex, mode: step.mode },
        });
        await tx.approvalFlowStepAssignee.createMany({
          data: step.assigneeIds.map((assigneeId) => ({ stepId: createdStep.id, assigneeId })),
        });
      }

      await auditEvents.record(params.user, {
        action: 'AdminFlow.Upsert',
        entityType: 'ApprovalFlowTemplate',
        entityId: t.id,
        tx,
      });
      return t;
    });
    return template;
  },

  async deactivateTemplate(params: { user: SessionUser; templateId: string }) {
    if (params.user.role !== 'Admin') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.approvalFlowTemplate.update({ where: { id: params.templateId }, data: { isActive: false } });
      await auditEvents.record(params.user, {
        action: 'AdminFlow.Deactivate',
        entityType: 'ApprovalFlowTemplate',
        entityId: params.templateId,
        tx,
      });
    });
    return { ok: true } as const;
  },
};
