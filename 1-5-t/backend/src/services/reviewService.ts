import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { requireReviewTaskOwned } from '../auth/authorize.js';
import { approvalRecordRepository } from '../repositories/approvalRecordRepository.js';
import { auditEvents } from './auditEvents.js';
import { reviewProgressService } from './reviewProgressService.js';

export const reviewService = {
  async listMyPending(user: SessionUser) {
    if (user.role !== 'Reviewer') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }
    const tasks = await prisma.reviewTask.findMany({
      where: { assigneeId: user.id, status: 'Pending' },
      orderBy: { createdAt: 'asc' },
      include: { document: { select: { title: true } } },
    });
    return tasks;
  },

  async approve(params: { user: SessionUser; reviewTaskId: string }) {
    const task = await requireReviewTaskOwned({ reviewTaskId: params.reviewTaskId, user: params.user });
    if (params.user.role !== 'Reviewer') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedCount = await tx.reviewTask.updateMany({
        where: { id: task.id, assigneeId: params.user.id, status: 'Pending' },
        data: { status: 'Approved', actedAt: now },
      });
      if (updatedCount.count !== 1) {
        throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Task already acted' });
      }

      await approvalRecordRepository.createAppendOnly({
        documentId: task.documentId,
        documentVersionId: task.documentVersionId,
        reviewTaskId: task.id,
        actorId: params.user.id,
        action: 'Approved',
        tx,
      });

      await auditEvents.record(params.user, {
        action: 'ReviewTask.Approve',
        entityType: 'ReviewTask',
        entityId: task.id,
        metadata: { documentId: task.documentId },
        tx,
      });

      const progress = await reviewProgressService.onTaskApproved({
        documentId: task.documentId,
        stepKey: task.stepKey,
        tx,
      });
      if (progress.progressed && progress.documentApproved) {
        await auditEvents.record(params.user, {
          action: 'Document.Approved',
          entityType: 'Document',
          entityId: task.documentId,
          tx,
        });
      } else if (progress.progressed && !progress.documentApproved && progress.nextStepKey) {
        await auditEvents.record(params.user, {
          action: 'ReviewTask.CreateNextStep',
          entityType: 'Document',
          entityId: task.documentId,
          metadata: {
            nextStepKey: progress.nextStepKey,
            createdTasksCount: (progress as any).createdTasksCount,
          },
          tx,
        });
      }
    });
    return { ok: true } as const;
  },

  async reject(params: { user: SessionUser; reviewTaskId: string; reason: string }) {
    const task = await requireReviewTaskOwned({ reviewTaskId: params.reviewTaskId, user: params.user });
    if (params.user.role !== 'Reviewer') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedCount = await tx.reviewTask.updateMany({
        where: { id: task.id, assigneeId: params.user.id, status: 'Pending' },
        data: { status: 'Rejected', actedAt: now },
      });
      if (updatedCount.count !== 1) {
        throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Task already acted' });
      }

      await approvalRecordRepository.createAppendOnly({
        documentId: task.documentId,
        documentVersionId: task.documentVersionId,
        reviewTaskId: task.id,
        actorId: params.user.id,
        action: 'Rejected',
        reason: params.reason,
        tx,
      });

      // Cancel others and reject document.
      const cancelled = await tx.reviewTask.updateMany({
        where: { documentId: task.documentId, status: 'Pending', NOT: { id: task.id } },
        data: { status: 'Cancelled', actedAt: now },
      });
      await tx.document.update({ where: { id: task.documentId }, data: { status: 'Rejected' } });

      await auditEvents.record(params.user, {
        action: 'ReviewTask.Reject',
        entityType: 'ReviewTask',
        entityId: task.id,
        metadata: { documentId: task.documentId, reason: params.reason, cancelledCount: cancelled.count },
        tx,
      });

      if (cancelled.count > 0) {
        await auditEvents.record(params.user, {
          action: 'ReviewTask.CancelOthers',
          entityType: 'Document',
          entityId: task.documentId,
          metadata: { cancelledCount: cancelled.count },
          tx,
        });
      }
    });
    return { ok: true } as const;
  },
};
