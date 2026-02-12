import { AppError } from '@/lib/errors/AppError';
import type { LessonContentType } from '@/lib/types';

export function assertLessonContentConsistency(input: {
  contentType: LessonContentType;
  contentText?: string | null;
  contentImageFileId?: string | null;
  contentPdfFileId?: string | null;
}) {
  const { contentType, contentText, contentImageFileId, contentPdfFileId } = input;

  if (contentType === 'text') {
    if (!contentText) throw AppError.badRequest('text 內容必填');
    if (contentImageFileId || contentPdfFileId) throw AppError.badRequest('text 內容不得同時設定檔案');
    return;
  }

  if (contentType === 'image') {
    if (!contentImageFileId) throw AppError.badRequest('image 檔案必填');
    if (contentText || contentPdfFileId) throw AppError.badRequest('image 內容不得同時設定其他型態');
    return;
  }

  if (contentType === 'pdf') {
    if (!contentPdfFileId) throw AppError.badRequest('pdf 檔案必填');
    if (contentText || contentImageFileId) throw AppError.badRequest('pdf 內容不得同時設定其他型態');
    return;
  }
}
