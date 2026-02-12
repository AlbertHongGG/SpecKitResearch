import { ReviewTaskStatus } from '@prisma/client';
import { prisma } from './prisma.js';

export async function listMyPendingTasks(assigneeId: string) {
  return prisma.reviewTask.findMany({
    where: { assigneeId, status: ReviewTaskStatus.Pending },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      documentId: true,
      stepKey: true,
      mode: true,
      status: true,
      createdAt: true,
      document: { select: { title: true, status: true, updatedAt: true } },
    },
  });
}

export async function getTaskById(id: string) {
  return prisma.reviewTask.findUnique({ where: { id } });
}

export async function markTaskApprovedOnce(options: { taskId: string; assigneeId: string; actedAt: Date }) {
  const updated = await prisma.reviewTask.updateMany({
    where: { id: options.taskId, assigneeId: options.assigneeId, status: ReviewTaskStatus.Pending },
    data: { status: ReviewTaskStatus.Approved, actedAt: options.actedAt },
  });
  return updated.count;
}

export async function markTaskRejectedOnce(options: {
  taskId: string;
  assigneeId: string;
  actedAt: Date;
}) {
  const updated = await prisma.reviewTask.updateMany({
    where: { id: options.taskId, assigneeId: options.assigneeId, status: ReviewTaskStatus.Pending },
    data: { status: ReviewTaskStatus.Rejected, actedAt: options.actedAt },
  });
  return updated.count;
}

