import { fetchJson } from '@/lib/http/fetchJson';

export const progressClient = {
  setCompletion: (lessonId: string, isCompleted: boolean) =>
    fetchJson<{ lessonId: string; isCompleted: boolean; completedAt: string | null }>(
      `/api/lessons/${lessonId}/progress`,
      {
        method: 'PUT',
        body: JSON.stringify({ isCompleted }),
      },
    ),
};
