import { prisma } from '../db/prisma.js';

export const documentVersionRepository = {
  createVersion(params: { documentId: string; versionNo: number; content: string }) {
    return prisma.documentVersion.create({
      data: {
        documentId: params.documentId,
        versionNo: params.versionNo,
        content: params.content,
      },
    });
  },

  findMaxVersionNo(documentId: string) {
    return prisma.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNo: true },
    });
  },
};
