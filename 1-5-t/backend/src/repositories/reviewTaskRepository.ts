import { prisma } from '../db/prisma.js';

export const reviewTaskRepository = {
  listMyPending(userId: string) {
    return prisma.reviewTask.findMany({
      where: { assigneeId: userId, status: 'Pending' },
      orderBy: { createdAt: 'asc' },
      include: { document: { select: { title: true } } },
    });
  },

  findById(id: string) {
    return prisma.reviewTask.findUnique({ where: { id } });
  },

  async actOnce(params: {
    taskId: string;
    assigneeId: string;
    newStatus: 'Approved' | 'Rejected';
    actedAt: Date;
  }) {
    // Conditional update ensures one-time action.
    const result = await prisma.reviewTask.updateMany({
      where: { id: params.taskId, assigneeId: params.assigneeId, status: 'Pending' },
      data: { status: params.newStatus, actedAt: params.actedAt },
    });
    return result.count;
  },

  cancelOtherPendingForDocument(documentId: string, exceptTaskId: string) {
    return prisma.reviewTask.updateMany({
      where: { documentId, status: 'Pending', NOT: { id: exceptTaskId } },
      data: { status: 'Cancelled', actedAt: new Date() },
    });
  },

  listByDocument(documentId: string) {
    return prisma.reviewTask.findMany({ where: { documentId }, orderBy: { createdAt: 'asc' } });
  },

  createMany(data: Array<any>) {
    return prisma.reviewTask.createMany({ data });
  },
};
