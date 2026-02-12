import type { CourseStatus } from '@prisma/client';

import { DomainError } from '../server/errors/errors';

export type CourseLifecycleAction =
  | { type: 'SUBMIT' }
  | { type: 'BACK_TO_DRAFT' }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; reason: string }
  | { type: 'ARCHIVE' }
  | { type: 'UNARCHIVE' };

export type CourseStatusUpdate = {
  status: CourseStatus;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  rejectedReason?: string | null;
};

export function transitionCourseStatus(params: {
  current: {
    status: CourseStatus;
    publishedAt: Date | null;
    archivedAt: Date | null;
    rejectedReason: string | null;
  };
  action: CourseLifecycleAction;
  now?: Date;
}): CourseStatusUpdate {
  const now = params.now ?? new Date();
  const { current, action } = params;

  switch (action.type) {
    case 'SUBMIT': {
      if (current.status !== 'draft' && current.status !== 'rejected') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可提交審核',
          details: { from: current.status, to: 'submitted' },
        });
      }
      return {
        status: 'submitted',
        rejectedReason: null,
      };
    }

    case 'BACK_TO_DRAFT': {
      if (current.status !== 'rejected') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可回到草稿',
          details: { from: current.status, to: 'draft' },
        });
      }
      return {
        status: 'draft',
        rejectedReason: null,
      };
    }

    case 'APPROVE': {
      if (current.status !== 'submitted') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可核准上架',
          details: { from: current.status, to: 'published' },
        });
      }
      return {
        status: 'published',
        publishedAt: current.publishedAt ?? now,
        archivedAt: null,
        rejectedReason: null,
      };
    }

    case 'REJECT': {
      if (current.status !== 'submitted') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可駁回',
          details: { from: current.status, to: 'rejected' },
        });
      }
      if (!action.reason.trim()) {
        throw new DomainError({
          code: 'VALIDATION_ERROR',
          message: '駁回理由必填',
        });
      }
      return {
        status: 'rejected',
        rejectedReason: action.reason,
      };
    }

    case 'ARCHIVE': {
      if (current.status !== 'published') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可下架',
          details: { from: current.status, to: 'archived' },
        });
      }
      return {
        status: 'archived',
        archivedAt: now,
      };
    }

    case 'UNARCHIVE': {
      if (current.status !== 'archived') {
        throw new DomainError({
          code: 'BAD_REQUEST',
          message: '目前狀態不可上架',
          details: { from: current.status, to: 'published' },
        });
      }
      return {
        status: 'published',
        archivedAt: null,
        publishedAt: current.publishedAt ?? now,
      };
    }

    default: {
      const _exhaustive: never = action;
      throw new DomainError({ code: 'INTERNAL_ERROR', message: '未知狀態轉換' });
    }
  }
}
