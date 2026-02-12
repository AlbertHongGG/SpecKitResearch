import { prisma } from '../db/prisma.js';
import { ApiError } from '../observability/errors.js';
import type { SessionUser } from './session.js';
import { shouldHideExistenceForReviewer } from '../domain/authzSemantics.js';

export async function requireDocumentVisible(params: { documentId: string; user: SessionUser }) {
  const { documentId, user } = params;

  if (user.role === 'Admin') {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
    return doc;
  }

  if (user.role === 'User') {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
    if (doc.ownerId !== user.id) {
      throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
    }
    return doc;
  }

  // Reviewer: only visible if associated via a task.
  const task = await prisma.reviewTask.findFirst({
    where: { documentId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) {
    throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
  }
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
  return doc;
}

export async function requireReviewTaskOwned(params: { reviewTaskId: string; user: SessionUser }) {
  const { reviewTaskId, user } = params;
  const task = await prisma.reviewTask.findUnique({ where: { id: reviewTaskId } });
  if (!task) {
    throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
  }
  if (user.role === 'Admin') return task;
  if (task.assigneeId !== user.id) {
    if (shouldHideExistenceForReviewer(user.role)) {
      throw new ApiError({ statusCode: 404, code: 'NotFound', message: 'Not found' });
    }
    throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
  }
  return task;
}
