import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { StepMode } from '@prisma/client';
import { requireRole } from '../../lib/rbac.js';
import { notFound, stateNotAllowed, validationFailed } from '../../lib/httpError.js';
import { prisma } from '../../repo/prisma.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../../domain/auditEvents.js';
import { assertFlowHasSteps, assertEachStepHasAssignees } from '../../domain/flowValidation.js';

const StepSchema = z.object({
  stepKey: z.string().min(1).max(50),
  orderIndex: z.number().int().min(0),
  mode: z.nativeEnum(StepMode),
  reviewerIds: z.array(z.string().uuid()).min(1),
});

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  isActive: z.boolean().optional(),
  steps: z.array(StepSchema).min(1),
});

type UpsertBody = z.infer<typeof UpsertSchema>;

function validateUnique(body: UpsertBody) {
  const stepKeySet = new Set<string>();
  const orderSet = new Set<number>();
  for (const s of body.steps) {
    if (stepKeySet.has(s.stepKey)) throw validationFailed('Duplicate stepKey', { stepKey: s.stepKey });
    if (orderSet.has(s.orderIndex)) throw validationFailed('Duplicate orderIndex', { orderIndex: s.orderIndex });
    stepKeySet.add(s.stepKey);
    orderSet.add(s.orderIndex);
  }
}

export async function registerAdminUpsertFlowRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: UpsertBody }>(
    '/admin/flows',
    {
      preHandler: requireRole(['Admin']),
    },
    async (request) => {
      const user = request.currentUser!;
      const body = UpsertSchema.parse(request.body);
      validateUnique(body);

      const asTemplate = {
        id: body.id ?? 'new',
        isActive: body.isActive ?? true,
        steps: body.steps.map((s) => ({
          stepKey: s.stepKey,
          assignees: s.reviewerIds.map((rid) => ({ id: rid })),
        })),
      };

      // Domain validations.
      assertFlowHasSteps(asTemplate);
      assertEachStepHasAssignees({
        id: asTemplate.id,
        isActive: asTemplate.isActive,
        name: body.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: body.steps.map((s) => ({
          id: 'tmp',
          templateId: asTemplate.id,
          stepKey: s.stepKey,
          orderIndex: s.orderIndex,
          mode: s.mode,
          assignees: s.reviewerIds.map((rid) => ({ id: 'tmp', stepId: 'tmp', reviewerId: rid })),
        })),
      });

      const saved = await prisma.$transaction(async (tx) => {
        if (body.id) {
          const existing = await tx.approvalFlowTemplate.findUnique({ where: { id: body.id } });
          if (!existing) throw notFound();

          const inUse = await tx.document.count({
            where: { flowTemplateId: body.id, status: { in: ['InReview', 'Submitted'] } },
          });
          if (inUse > 0) {
            throw stateNotAllowed('Flow template is in use and cannot be modified', { templateId: body.id });
          }

          const updated = await tx.approvalFlowTemplate.update({
            where: { id: body.id },
            data: { name: body.name, isActive: body.isActive ?? existing.isActive },
            select: { id: true, isActive: true },
          });

          const stepIds = await tx.approvalFlowStep.findMany({
            where: { templateId: body.id },
            select: { id: true },
          });

          if (stepIds.length > 0) {
            await tx.approvalFlowStepAssignee.deleteMany({ where: { stepId: { in: stepIds.map((s) => s.id) } } });
          }
          await tx.approvalFlowStep.deleteMany({ where: { templateId: body.id } });

          for (const step of body.steps) {
            const createdStep = await tx.approvalFlowStep.create({
              data: {
                templateId: body.id,
                stepKey: step.stepKey,
                orderIndex: step.orderIndex,
                mode: step.mode,
              },
              select: { id: true },
            });
            await tx.approvalFlowStepAssignee.createMany({
              data: step.reviewerIds.map((rid) => ({ stepId: createdStep.id, reviewerId: rid })),
            });
          }

          return updated;
        }

        const created = await tx.approvalFlowTemplate.create({
          data: { name: body.name, isActive: body.isActive ?? true },
          select: { id: true, isActive: true },
        });

        for (const step of body.steps) {
          const createdStep = await tx.approvalFlowStep.create({
            data: {
              templateId: created.id,
              stepKey: step.stepKey,
              orderIndex: step.orderIndex,
              mode: step.mode,
            },
            select: { id: true },
          });
          await tx.approvalFlowStepAssignee.createMany({
            data: step.reviewerIds.map((rid) => ({ stepId: createdStep.id, reviewerId: rid })),
          });
        }

        return created;
      });

      await appendAuditLog(
        buildAuditEvent({
          actorId: user.id,
          requestId: request.id,
          action: AuditActions.FlowUpserted,
          entityType: 'ApprovalFlowTemplate',
          entityId: saved.id,
          metadata: {
            isActive: saved.isActive,
            name: body.name,
            steps: body.steps.map((s) => ({
              stepKey: s.stepKey,
              orderIndex: s.orderIndex,
              mode: s.mode,
              reviewerIds: s.reviewerIds,
            })),
          },
        }),
      );

      return { templateId: saved.id, isActive: saved.isActive };
    },
  );
}
