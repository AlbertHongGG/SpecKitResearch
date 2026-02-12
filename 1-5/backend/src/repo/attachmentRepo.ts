import { prisma } from './prisma.js';

export async function createAttachment(options: {
  documentVersionId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
}) {
  return prisma.attachment.create({
    data: {
      documentVersionId: options.documentVersionId,
      filename: options.filename,
      contentType: options.contentType,
      sizeBytes: options.sizeBytes,
      storageKey: options.storageKey,
    },
  });
}
