import { DocumentStatus } from '@prisma/client';

import { prisma } from '../../repo/prisma.js';
import { notFound } from '../../lib/httpError.js';
import { appendAuditLog } from '../../repo/auditRepo.js';
import { AuditActions, buildAuditEvent } from '../auditEvents.js';
import { assertCanArchive, assertLegalTransition } from '../documentStateMachine.js';
import { toContractDocumentStatus } from '../types.js';

export async function archiveDocument(options: { actorId: string; documentId: string; requestId: string }) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: options.documentId },
      select: { id: true, status: true },
    });
    if (!doc) throw notFound();

    assertCanArchive(doc);
    assertLegalTransition(DocumentStatus.Approved, DocumentStatus.Archived);

    const updated = await tx.document.update({
      where: { id: options.documentId },
      data: { status: DocumentStatus.Archived },
      select: { id: true, status: true },
    });

    await appendAuditLog(
      buildAuditEvent({
        actorId: options.actorId,
        requestId: options.requestId,
        action: AuditActions.DocumentArchived,
        entityType: 'Document',
        entityId: updated.id,
        metadata: { from: DocumentStatus.Approved, to: DocumentStatus.Archived },
      }),
    );

    return { documentId: updated.id, status: toContractDocumentStatus(updated.status) };
  });
}
