import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function useMarkProgress(courseId: string, lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (isCompleted: boolean) =>
      apiFetch(`/my-courses/${courseId}/lessons/${lessonId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['reader', courseId] });
      client.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });
}
