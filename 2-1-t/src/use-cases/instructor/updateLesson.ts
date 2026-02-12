import type { LessonContentType } from '@prisma/client';

import { DomainError } from '../../server/errors/errors';

export type LessonContentUpdate =
  | { contentType: 'text'; contentText: string }
  | { contentType: 'image'; contentFileId: string }
  | { contentType: 'pdf'; contentFileId: string; contentFileName: string };

export function normalizeLessonContent(params: {
  nextContentType: LessonContentType;
  contentText?: string | null;
  contentFileId?: string | null;
  contentFileName?: string | null;
}): LessonContentUpdate {
  const { nextContentType } = params;

  if (nextContentType === 'text') {
    const contentText = (params.contentText ?? '').toString();
    if (!contentText.trim()) {
      throw new DomainError({ code: 'VALIDATION_ERROR', message: '文字內容必填' });
    }
    return { contentType: 'text', contentText };
  }

  if (nextContentType === 'image') {
    const contentFileId = params.contentFileId ?? '';
    if (!contentFileId.trim()) {
      throw new DomainError({ code: 'VALIDATION_ERROR', message: '圖片檔案必填' });
    }
    return { contentType: 'image', contentFileId };
  }

  if (nextContentType === 'pdf') {
    const contentFileId = params.contentFileId ?? '';
    if (!contentFileId.trim()) {
      throw new DomainError({ code: 'VALIDATION_ERROR', message: 'PDF 檔案必填' });
    }
    const contentFileName = (params.contentFileName ?? '').toString();
    if (!contentFileName.trim()) {
      throw new DomainError({ code: 'VALIDATION_ERROR', message: 'PDF 檔名必填' });
    }
    return { contentType: 'pdf', contentFileId, contentFileName };
  }

  throw new DomainError({ code: 'INTERNAL_ERROR', message: '未知 contentType' });
}
