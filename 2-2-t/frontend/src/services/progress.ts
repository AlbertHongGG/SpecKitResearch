import { apiFetch } from './api-client';
import { MarkCompleteResponseSchema } from '@app/contracts';
import { z } from 'zod';

const MarkCompleteResponse = MarkCompleteResponseSchema;
export type MarkCompleteResponse = z.infer<typeof MarkCompleteResponse>;

export async function markLessonComplete(lessonId: string) {
  const res = await apiFetch<unknown>('/progress/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lessonId }),
  });
  return MarkCompleteResponse.parse(res);
}
