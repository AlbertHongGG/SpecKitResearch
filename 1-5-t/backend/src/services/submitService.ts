import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { requireDocumentVisible } from '../auth/authorize.js';
import { assertDocumentTransition } from '../domain/documentStateMachine.js';
import { auditEvents } from './auditEvents.js';

function validateTemplateCompleteness(template: any) {
  if (!template || !template.isActive) {
    throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Invalid or inactive template' });
  }
  const steps = template.steps ?? [];
  if (steps.length < 1) {
    throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Template has no steps' });
  }
  for (const step of steps) {
    const assignees = step.assignees ?? [];
    if (assignees.length < 1) {
      throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Template step missing assignees' });
    }
    if (step.mode === 'Serial' && assignees.length !== 1) {
      throw new ApiError({
        statusCode: 400,
        code: 'ValidationError',
        message: 'Serial step must have exactly 1 assignee',
      });
    }
  }
}

export const submitService = {
  async submitForApproval(params: { user: SessionUser; documentId: string; templateId: string }) {
    const doc = await requireDocumentVisible({ documentId: params.documentId, user: params.user });
    if (doc.status !== 'Draft') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Only Draft can be submitted' });
    }
    if (params.user.role === 'User' && doc.ownerId !== params.user.id) {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const template = await tx.approvalFlowTemplate.findUnique({
        where: { id: params.templateId },
        include: {
          steps: { include: { assignees: true }, orderBy: { orderIndex: 'asc' } },
        },
      });
      validateTemplateCompleteness(template);

      const current = await tx.document.findUnique({
        where: { id: params.documentId },
        include: { currentVersion: true },
      });
      if (!current) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
      if (!current.currentVersion) {
        throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
      }
      assertDocumentTransition(current.status, 'Submitted');

      const max = await tx.documentVersion.aggregate({
        where: { documentId: params.documentId },
        _max: { versionNo: true },
      });
      const nextNo = (max._max.versionNo ?? 0) + 1;
      const locked = await tx.documentVersion.create({
        data: {
          documentId: params.documentId,
          versionNo: nextNo,
          content: current.currentVersion.content,
        },
      });

      const updated = await tx.document.update({
        where: { id: params.documentId },
        data: {
          status: 'InReview',
          currentVersionId: locked.id,
          flowTemplateId: template!.id,
        },
      });

      const firstStep = template!.steps[0];
      if (!firstStep) {
        throw new ApiError({ statusCode: 400, code: 'ValidationError', message: 'Template has no steps' });
      }
      const assigneeIds = firstStep.assignees.map((a) => a.assigneeId);

      await tx.reviewTask.createMany({
        data: assigneeIds.map((assigneeId: string) => ({
          documentId: updated.id,
          documentVersionId: locked.id,
          assigneeId,
          stepKey: firstStep.stepKey,
          mode: firstStep.mode,
          status: 'Pending',
        })),
      });

      await auditEvents.record(params.user, {
        action: 'Document.SubmitForApproval',
        entityType: 'Document',
        entityId: params.documentId,
        metadata: { templateId: params.templateId, lockedVersionId: locked.id },
        tx,
      });

      return { updated, lockedVersionId: locked.id, firstStepKey: firstStep.stepKey };
    });

    return result;
  },
};
