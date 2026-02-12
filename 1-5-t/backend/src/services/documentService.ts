import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { requireDocumentVisible } from '../auth/authorize.js';
import { assertDocumentTransition } from '../domain/documentStateMachine.js';
import { auditEvents } from './auditEvents.js';

export const documentService = {
  async createDraft(user: SessionUser, params: { title: string }) {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const doc = await tx.document.create({
        data: {
          title: params.title,
          status: 'Draft',
          ownerId: user.id,
        },
        select: { id: true },
      });
      const version = await tx.documentVersion.create({
        data: { documentId: doc.id, versionNo: 1, content: '' },
        select: { id: true },
      });
      await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: version.id } });

      await auditEvents.record(user, {
        action: 'Document.CreateDraft',
        entityType: 'Document',
        entityId: doc.id,
        tx,
      });
      return doc;
    });
    return created;
  },

  async listVisible(user: SessionUser) {
    if (user.role === 'Admin') {
      return prisma.document.findMany({
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, updatedAt: true },
      });
    }
    if (user.role === 'User') {
      return prisma.document.findMany({
        where: { ownerId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, updatedAt: true },
      });
    }
    // Reviewer: visible docs are those with tasks assigned.
    const docs = await prisma.reviewTask.findMany({
      where: { assigneeId: user.id },
      distinct: ['documentId'],
      select: { documentId: true },
    });
    const documentIds = docs.map((d) => d.documentId);
    return prisma.document.findMany({
      where: { id: { in: documentIds } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, updatedAt: true },
    });
  },

  async getDetail(user: SessionUser, documentId: string) {
    await requireDocumentVisible({ documentId, user });
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        currentVersion: { include: { attachments: { orderBy: { createdAt: 'asc' } } } },
        reviewTasks: { orderBy: { createdAt: 'asc' } },
        approvalRecords: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!doc) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Document', entityId: doc.id },
      orderBy: { createdAt: 'asc' },
    });
    return { doc, auditLogs };
  },

  async updateDraft(user: SessionUser, documentId: string, params: { title?: string; content?: string }) {
    const doc = await requireDocumentVisible({ documentId, user });
    if (doc.status !== 'Draft') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Only Draft can be edited' });
    }
    if (user.role === 'User' && doc.ownerId !== user.id) {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const d = await tx.document.update({
        where: { id: documentId },
        data: {
          ...(params.title !== undefined ? { title: params.title } : {}),
        },
      });
      if (params.content !== undefined) {
        await tx.documentVersion.update({
          where: { id: d.currentVersionId ?? '' },
          data: { content: params.content },
        });
      }

      await auditEvents.record(user, {
        action: 'Document.UpdateDraft',
        entityType: 'Document',
        entityId: documentId,
        metadata: { changed: { title: params.title !== undefined, content: params.content !== undefined } },
        tx,
      });

      return d;
    });
    return updated;
  },

  async reopenAsDraft(user: SessionUser, documentId: string) {
    const doc = await requireDocumentVisible({ documentId, user });
    if (doc.status !== 'Rejected') {
      throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Only Rejected can be reopened as Draft' });
    }

    const reopened = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.document.findUnique({
        where: { id: documentId },
        include: { currentVersion: true },
      });
      if (!current) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
      if (!current.currentVersionId) {
        throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
      }
      if (!current.currentVersion) {
        throw new ApiError({ statusCode: 500, code: 'InternalError', message: 'Missing current version' });
      }
      assertDocumentTransition(current.status, 'Draft');

      const max = await tx.documentVersion.aggregate({
        where: { documentId },
        _max: { versionNo: true },
      });
      const nextNo = (max._max.versionNo ?? 0) + 1;
      const newVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNo: nextNo,
          content: current.currentVersion.content,
        },
      });

      const updated = await tx.document.update({
        where: { id: documentId },
        data: { status: 'Draft', currentVersionId: newVersion.id },
      });

      await auditEvents.record(user, {
        action: 'Document.ReopenAsDraft',
        entityType: 'Document',
        entityId: documentId,
        tx,
      });
      return updated;
    });
    return reopened;
  },
};
