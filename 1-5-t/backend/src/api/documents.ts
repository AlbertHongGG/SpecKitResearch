import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateDraftRequestSchema,
  UpdateDraftRequestSchema,
  DocumentDetailResponseSchema,
} from '@internal/contracts';
import { parseBody, parseParams } from './validation.js';
import { requireAuthenticatedUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { documentService } from '../services/documentService.js';

const DocumentIdParamsSchema = z.object({ documentId: z.string().uuid() });

export async function registerDocumentsRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const user = requireAuthenticatedUser(request);
    const docs = await documentService.listVisible(user);
    return { documents: docs.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() })) };
  });

  app.post('/', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    if (user.role === 'Reviewer') {
      return reply.status(403).send({
        error: { code: 'Forbidden', message: 'Forbidden', requestId: request.requestId },
      });
    }
    const body = parseBody(request, CreateDraftRequestSchema);
    const created = await documentService.createDraft(user, { title: body.title });
    return reply.status(201).send({ documentId: created.id });
  });

  app.get('/:documentId', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { documentId } = parseParams(request, DocumentIdParamsSchema);
    const { doc, auditLogs } = await documentService.getDetail(user, documentId);
    if (!doc.currentVersion) {
      throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
    }
    const payload = {
      document: {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        ownerId: doc.ownerId,
        currentVersion: {
          id: doc.currentVersion.id,
          versionNo: doc.currentVersion.versionNo,
          content: doc.currentVersion.content,
          createdAt: doc.currentVersion.createdAt.toISOString(),
        },
        attachments: doc.currentVersion.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes,
          createdAt: a.createdAt.toISOString(),
        })),
        reviewTasks: doc.reviewTasks.map((t) => ({
          id: t.id,
          assigneeId: t.assigneeId,
          stepKey: t.stepKey,
          mode: t.mode,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          actedAt: t.actedAt?.toISOString(),
        })),
        approvalRecords: doc.approvalRecords.map((r) => ({
          id: r.id,
          reviewTaskId: r.reviewTaskId,
          actorId: r.actorId,
          action: r.action,
          reason: r.reason ?? undefined,
          createdAt: r.createdAt.toISOString(),
        })),
        auditLogs: auditLogs.map((l) => ({
          id: l.id,
          actorId: l.actorId,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          createdAt: l.createdAt.toISOString(),
          metadataJson: l.metadataJson,
        })),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    };
    // Validate response shape matches shared contract.
    DocumentDetailResponseSchema.parse(payload);
    return payload;
  });

  app.put('/:documentId/draft', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { documentId } = parseParams(request, DocumentIdParamsSchema);
    const body = parseBody(request, UpdateDraftRequestSchema);
    await documentService.updateDraft(user, documentId, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
    });
    return { ok: true };
  });

  app.post('/:documentId/reopen', async (request) => {
    const user = requireAuthenticatedUser(request);
    const { documentId } = parseParams(request, DocumentIdParamsSchema);
    await documentService.reopenAsDraft(user, documentId);
    return { ok: true };
  });
}
