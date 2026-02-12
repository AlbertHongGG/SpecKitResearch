import { prisma } from '../db/prisma.js';
import { ApiError } from '../observability/errors.js';
import type { Prisma } from '@prisma/client';

export const approvalRecordRepository = {
  async createAppendOnly(params: {
    documentId: string;
    documentVersionId: string;
    reviewTaskId: string;
    actorId: string;
    action: 'Approved' | 'Rejected';
    reason?: string;
    tx?: Prisma.TransactionClient;
  }) {
    try {
      const client = params.tx ?? prisma;
      return await client.approvalRecord.create({
        data: {
          documentId: params.documentId,
          documentVersionId: params.documentVersionId,
          reviewTaskId: params.reviewTaskId,
          actorId: params.actorId,
          action: params.action,
          reason: params.reason ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ApiError({ statusCode: 409, code: 'Conflict', message: 'Approval record already exists' });
      }
      throw e;
    }
  },
};
