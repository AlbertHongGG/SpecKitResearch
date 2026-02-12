import { prisma } from '../db/prisma.js';

export const documentRepository = {
  createDraft(params: { ownerId: string; title: string; content: string }) {
    return prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          title: params.title,
          status: 'Draft',
          ownerId: params.ownerId,
        },
      });
      const version = await tx.documentVersion.create({
        data: { documentId: doc.id, versionNo: 1, content: params.content },
      });
      return tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
        include: { currentVersion: true },
      });
    });
  },

  findById(id: string) {
    return prisma.document.findUnique({ where: { id } });
  },

  findByIdWithAll(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: { attachments: { orderBy: { createdAt: 'asc' } } },
        },
        reviewTasks: { orderBy: { createdAt: 'asc' } },
        approvalRecords: { orderBy: { createdAt: 'asc' } },
      },
    });
  },

  listByOwner(ownerId: string) {
    return prisma.document.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, updatedAt: true },
    });
  },

  listAll() {
    return prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, updatedAt: true },
    });
  },
};
