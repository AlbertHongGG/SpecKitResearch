import {
  ApprovalAction,
  DocumentStatus,
  Prisma,
  ReviewTaskStatus,
  type ApprovalFlowStep,
} from '@prisma/client';

import { prisma } from '../../repo/prisma.js';
import { conflict, notFound, validationFailed } from '../../lib/httpError.js';
import { normalizeSteps, initialAssigneesForStep, nextAssigneeForSerial, getNextStepKey, isStepComplete } from '../reviewStepEngine.js';
import { validateTemplateForSubmission } from '../flowValidation.js';
import { assertLegalTransition } from '../documentStateMachine.js';
import { AuditActions } from '../auditEvents.js';
import { toContractDocumentStatus } from '../types.js';

async function createReviewTaskOnce(
  tx: Prisma.TransactionClient,
  data: {
    documentId: string;
    documentVersionId: string;
    assigneeId: string;
    stepKey: string;
    mode: 'Serial' | 'Parallel';
    status: ReviewTaskStatus;
  },
): Promise<void> {
  try {
    await tx.reviewTask.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return;
    }
    throw err;
  }
}

function toStepDefinition(step: ApprovalFlowStep & { assignees: Array<{ reviewerId: string }> }) {
  return {
    stepKey: step.stepKey,
    orderIndex: step.orderIndex,
    mode: step.mode,
    reviewerIds: step.assignees.map((a) => a.reviewerId),
  };
}

export async function actOnReviewTask(options: {
  actorId: string;
  taskId: string;
  action: 'Approve' | 'Reject';
  reason?: string;
  requestId: string;
}): Promise<{ documentId: string; status: string }> {
  if (options.action === 'Reject' && (!options.reason || options.reason.trim().length === 0)) {
    throw validationFailed('Reject requires reason');
  }

  const actedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const task = await tx.reviewTask.findUnique({
      where: { id: options.taskId },
      include: { document: true },
    });
    if (!task) throw notFound();
    if (task.assigneeId !== options.actorId) throw notFound();

    if (task.status !== ReviewTaskStatus.Pending) {
      throw conflict('Review task already processed');
    }

    const doc = task.document;
    if (doc.status !== DocumentStatus.InReview) {
      throw conflict('Document not in review');
    }

    const templateId = doc.flowTemplateId;
    if (!templateId) throw validationFailed('Document has no flow template');

    const template = await tx.approvalFlowTemplate.findUnique({
      where: { id: templateId },
      include: { steps: { orderBy: { orderIndex: 'asc' }, include: { assignees: true } } },
    });
    if (!template) throw validationFailed('Flow template not found');
    validateTemplateForSubmission(template);

    // Single-use guard (CAS): only one request can flip Pending → Approved/Rejected.
    const updated = await tx.reviewTask.updateMany({
      where: { id: task.id, assigneeId: options.actorId, status: ReviewTaskStatus.Pending },
      data:
        options.action === 'Approve'
          ? { status: ReviewTaskStatus.Approved, actedAt }
          : { status: ReviewTaskStatus.Rejected, actedAt },
    });

    if (updated.count !== 1) throw conflict('Review task already processed');

    await tx.approvalRecord.create({
      data: {
        documentId: task.documentId,
        documentVersionId: task.documentVersionId,
        reviewTaskId: task.id,
        actorId: options.actorId,
        action: options.action === 'Approve' ? ApprovalAction.Approved : ApprovalAction.Rejected,
        reason: options.action === 'Reject' ? options.reason?.trim() : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: options.actorId,
        action: AuditActions.ReviewTaskActed,
        entityType: 'Document',
        entityId: task.documentId,
        requestId: options.requestId,
        metadataJson: JSON.stringify({
          taskId: task.id,
          action: options.action,
          reason: options.reason,
          stepKey: task.stepKey,
        }),
      },
    });

    if (options.action === 'Reject') {
      // Cancel all other pending tasks for this submitted snapshot.
      await tx.reviewTask.updateMany({
        where: {
          documentId: task.documentId,
          documentVersionId: task.documentVersionId,
          status: ReviewTaskStatus.Pending,
          NOT: { id: task.id },
        },
        data: { status: ReviewTaskStatus.Cancelled },
      });

      assertLegalTransition(DocumentStatus.InReview, DocumentStatus.Rejected);
      await tx.document.update({ where: { id: task.documentId }, data: { status: DocumentStatus.Rejected } });
      return { documentId: task.documentId, status: toContractDocumentStatus(DocumentStatus.Rejected) };
    }

    // Approve path: step progression.
    const orderedSteps = normalizeSteps(template.steps.map(toStepDefinition));
    const currentStep = orderedSteps.find((s) => s.stepKey === task.stepKey);
    if (!currentStep) throw validationFailed('Unknown step key');

    const tasksInStep = await tx.reviewTask.findMany({
      where: {
        documentId: task.documentId,
        documentVersionId: task.documentVersionId,
        stepKey: task.stepKey,
      },
    });

    const approvedAssigneeIds = tasksInStep
      .filter((t) => t.status === ReviewTaskStatus.Approved)
      .map((t) => t.assigneeId);

    if (currentStep.mode === 'Serial') {
      const nextAssigneeId = nextAssigneeForSerial({
        reviewerIds: currentStep.reviewerIds,
        approvedAssigneeIds,
      });

      if (nextAssigneeId) {
        await createReviewTaskOnce(tx, {
          documentId: task.documentId,
          documentVersionId: task.documentVersionId,
          assigneeId: nextAssigneeId,
          stepKey: currentStep.stepKey,
          mode: currentStep.mode,
          status: ReviewTaskStatus.Pending,
        });

        return { documentId: task.documentId, status: toContractDocumentStatus(DocumentStatus.InReview) };
      }
    }

    const stepDone = isStepComplete({
      mode: currentStep.mode,
      reviewerIds: currentStep.reviewerIds,
      approvedAssigneeIds,
    });

    if (!stepDone) {
      return { documentId: task.documentId, status: toContractDocumentStatus(DocumentStatus.InReview) };
    }

    const nextStepKey = getNextStepKey(orderedSteps, currentStep.stepKey);
    if (!nextStepKey) {
      assertLegalTransition(DocumentStatus.InReview, DocumentStatus.Approved);
      await tx.document.update({ where: { id: task.documentId }, data: { status: DocumentStatus.Approved } });
      return { documentId: task.documentId, status: toContractDocumentStatus(DocumentStatus.Approved) };
    }

    const nextStep = orderedSteps.find((s) => s.stepKey === nextStepKey);
    if (!nextStep) throw validationFailed('Unknown next step');
    const initialAssignees = initialAssigneesForStep(nextStep);

    for (const assigneeId of initialAssignees) {
      await createReviewTaskOnce(tx, {
        documentId: task.documentId,
        documentVersionId: task.documentVersionId,
        assigneeId,
        stepKey: nextStep.stepKey,
        mode: nextStep.mode,
        status: ReviewTaskStatus.Pending,
      });
    }

    return { documentId: task.documentId, status: toContractDocumentStatus(DocumentStatus.InReview) };
  });
}
