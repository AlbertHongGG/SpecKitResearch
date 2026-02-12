import { DocumentStatus, DocumentVersionKind, ReviewTaskStatus } from '@prisma/client';

import { prisma } from '../../repo/prisma.js';
import { assertCanSubmit, assertLegalTransition } from '../documentStateMachine.js';
import { validateTemplateForSubmission } from '../flowValidation.js';
import { normalizeSteps, initialAssigneesForStep } from '../reviewStepEngine.js';
import { validationFailed } from '../../lib/httpError.js';
import { toContractDocumentStatus } from '../types.js';
import { AuditActions } from '../auditEvents.js';

export async function submitDocument(options: {
  actorId: string;
  documentId: string;
  flowTemplateId: string;
  requestId: string;
}): Promise<{ documentId: string; status: string }> {
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.findUnique({
      where: { id: options.documentId },
      include: {
        currentVersion: {
          include: { attachments: true },
        },
      },
    });
    if (!document) throw validationFailed('Document not found');

    assertCanSubmit({ id: document.id, status: document.status, currentVersion: document.currentVersion });

    const template = await tx.approvalFlowTemplate.findUnique({
      where: { id: options.flowTemplateId },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
          include: { assignees: true },
        },
      },
    });
    if (!template) throw validationFailed('Flow template not found');
    validateTemplateForSubmission(template);

    const maxVersion = await tx.documentVersion.aggregate({
      where: { documentId: document.id },
      _max: { versionNo: true },
    });
    const nextVersionNo = (maxVersion._max.versionNo ?? 0) + 1;

    const snapshot = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNo: nextVersionNo,
        content: document.currentVersion!.content,
        kind: DocumentVersionKind.SubmittedSnapshot,
      },
    });

    if (document.currentVersion?.attachments?.length) {
      await tx.attachment.createMany({
        data: document.currentVersion.attachments.map((a) => ({
          documentVersionId: snapshot.id,
          filename: a.filename,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes,
          storageKey: a.storageKey,
        })),
      });
    }

    assertLegalTransition(DocumentStatus.Draft, DocumentStatus.Submitted);
    await tx.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.Submitted,
        flowTemplateId: template.id,
        currentVersionId: snapshot.id,
      },
    });

    assertLegalTransition(DocumentStatus.Submitted, DocumentStatus.InReview);
    await tx.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.InReview,
      },
    });

    const steps = normalizeSteps(
      template.steps.map((s) => ({
        stepKey: s.stepKey,
        orderIndex: s.orderIndex,
        mode: s.mode,
        reviewerIds: s.assignees.map((a) => a.reviewerId),
      })),
    );

    const firstStep = steps[0];
    if (!firstStep) throw validationFailed('Flow has no steps');
    const initialAssignees = initialAssigneesForStep(firstStep);
    await tx.reviewTask.createMany({
      data: initialAssignees.map((assigneeId) => ({
        documentId: document.id,
        documentVersionId: snapshot.id,
        assigneeId,
        stepKey: firstStep.stepKey,
        mode: firstStep.mode,
        status: ReviewTaskStatus.Pending,
      })),
    });

    await tx.auditLog.create({
      data: {
        actorId: options.actorId,
        action: AuditActions.DocumentSubmitted,
        entityType: 'Document',
        entityId: document.id,
        requestId: options.requestId,
        metadataJson: JSON.stringify({
          flowTemplateId: template.id,
          submittedVersionId: snapshot.id,
          createdTasks: initialAssignees.length,
        }),
      },
    });

    return { documentId: document.id, status: toContractDocumentStatus(DocumentStatus.InReview) };
  });
}
