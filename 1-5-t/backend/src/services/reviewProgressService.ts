import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { ApiError } from '../observability/errors.js';

export const reviewProgressService = {
  async onTaskApproved(params: { documentId: string; stepKey: string; tx?: Prisma.TransactionClient }) {
    const client = params.tx ?? prisma;

    const doc = await client.document.findUnique({ where: { id: params.documentId } });
    if (!doc) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });

    const pendingOrRejected = await client.reviewTask.findFirst({
      where: {
        documentId: params.documentId,
        stepKey: params.stepKey,
        status: { in: ['Pending', 'Rejected', 'Cancelled'] },
      },
      select: { id: true },
    });
    if (pendingOrRejected) {
      return { progressed: false };
    }

    // Step complete; create next step tasks or finish document.
    if (!doc.flowTemplateId) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing flow template' });
    }
    const template = await client.approvalFlowTemplate.findUnique({
      where: { id: doc.flowTemplateId },
      include: { steps: { include: { assignees: true }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!template) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Flow template not found' });
    }
    const steps = template.steps;
    const idx = steps.findIndex((s) => s.stepKey === params.stepKey);
    if (idx < 0) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Invalid step key' });
    }
    const next = steps[idx + 1];
    if (!next) {
      // Final step complete
      await client.document.update({ where: { id: doc.id }, data: { status: 'Approved' } });
      return { progressed: true, documentApproved: true };
    }

    const documentVersionId = doc.currentVersionId;
    if (!documentVersionId) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
    }

    const assigneeIds = next.assignees.map((a) => a.assigneeId);
    await client.reviewTask.createMany({
      data: assigneeIds.map((assigneeId) => ({
        documentId: doc.id,
        documentVersionId,
        assigneeId,
        stepKey: next.stepKey,
        mode: next.mode,
        status: 'Pending',
      })),
    });
    return { progressed: true, documentApproved: false, nextStepKey: next.stepKey, createdTasksCount: assigneeIds.length };
  },
};
