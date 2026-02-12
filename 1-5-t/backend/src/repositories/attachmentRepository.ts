import { prisma } from '../db/prisma.js';

export const attachmentRepository = {
  create(params: {
    documentVersionId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    storageKey: string;
  }) {
    return prisma.attachment.create({
      data: {
        documentVersionId: params.documentVersionId,
        filename: params.filename,
        contentType: params.contentType,
        sizeBytes: params.sizeBytes,
        storageKey: params.storageKey,
      },
    });
  },
};
