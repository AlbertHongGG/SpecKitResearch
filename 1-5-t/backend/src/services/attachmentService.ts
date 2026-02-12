import type { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { requireDocumentVisible } from '../auth/authorize.js';
import { validateAttachmentMetadata } from '../storage/attachmentValidation.js';
import { writeAttachmentCreateNew } from '../storage/attachments.js';
import { auditEvents } from './auditEvents.js';

export const attachmentService = {
  async uploadDraftAttachment(params: {
    user: SessionUser;
    documentId: string;
    filename: string;
    contentType: string;
    stream: Readable;
  }) {
    const doc = await requireDocumentVisible({ documentId: params.documentId, user: params.user });
    if (doc.status !== 'Draft') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Only Draft can upload attachments' });
    }
    const currentVersionId = doc.currentVersionId;
    if (!currentVersionId) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
    }
    if (params.user.role === 'User' && doc.ownerId !== params.user.id) {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }

    // sizeBytes is enforced by multipart limits; we compute the exact bytes written.
    validateAttachmentMetadata({ filename: params.filename, contentType: params.contentType, sizeBytes: 0 });

    const storageKey = randomUUID();
    const writeResult = await writeAttachmentCreateNew({ storageKey, stream: params.stream });
    validateAttachmentMetadata({
      filename: params.filename,
      contentType: params.contentType,
      sizeBytes: writeResult.sizeBytes,
    });

    const created = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          documentVersionId: currentVersionId,
          filename: params.filename,
          contentType: params.contentType,
          sizeBytes: writeResult.sizeBytes,
          storageKey,
        },
      });

      await auditEvents.record(params.user, {
        action: 'Attachment.UploadDraft',
        entityType: 'Document',
        entityId: params.documentId,
        metadata: { attachmentId: created.id, filename: created.filename, sizeBytes: created.sizeBytes },
        tx,
      });

      return created;
    });

    return created;
  },
};
