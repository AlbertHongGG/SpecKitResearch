'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';

export function useUpdateTaskMutation(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      version: number;
      patch: { title?: string; description?: string | null; dueDate?: string | null; priority?: number | null };
    }) => {
      const path = `/projects/${projectId}/tasks/${taskId}`;
      return runOrQueue(
        projectId,
        { path, method: 'PATCH', json: { version: input.version, ...input.patch } },
        async () => {
          const res = await apiFetch(path, {
            method: 'PATCH',
            json: { version: input.version, ...input.patch },
          });
          return res.data as any;
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });
}
