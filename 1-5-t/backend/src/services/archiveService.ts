import { prisma } from '../db/prisma.js';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { requireDocumentVisible } from '../auth/authorize.js';
import { assertDocumentTransition } from '../domain/documentStateMachine.js';
import { auditEvents } from './auditEvents.js';

export const archiveService = {
  async archiveApprovedDocument(params: { user: SessionUser; documentId: string }) {
    const doc = await requireDocumentVisible({ documentId: params.documentId, user: params.user });
    if (params.user.role !== 'Admin') {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }
    if (doc.status !== 'Approved') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Only Approved can be archived' });
    }

    assertDocumentTransition(doc.status, 'Archived');
    return prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: params.documentId },
        data: { status: 'Archived' },
      });

      await auditEvents.record(params.user, {
        action: 'Document.Archive',
        entityType: 'Document',
        entityId: params.documentId,
        tx,
      });

      return updated;
    });
  },
};
