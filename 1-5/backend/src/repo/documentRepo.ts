import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type DocumentStatusValue = 'Draft' | 'Submitted' | 'InReview' | 'Rejected' | 'Approved' | 'Archived';

export async function createDraftDocument(options: {
  ownerId: string;
  title: string;
  content: string;
}): Promise<{ document: Prisma.DocumentGetPayload<Record<string, never>>; version: Prisma.DocumentVersionGetPayload<Record<string, never>> }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const document = await tx.document.create({
      data: {
        ownerId: options.ownerId,
        title: options.title,
        status: 'Draft',
        currentVersionId: null,
      },
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNo: 1,
        content: options.content,
        kind: 'Draft',
      },
    });

    const updated = await tx.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    });

    return { document: updated, version };
  });
}

export async function listDocumentsByOwner(ownerId: string) {
  return prisma.document.findMany({
    where: { ownerId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function listDocumentsAll() {
  return prisma.document.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export async function updateDocumentStatus(id: string, status: DocumentStatusValue) {
  return prisma.document.update({ where: { id }, data: { status } });
}
