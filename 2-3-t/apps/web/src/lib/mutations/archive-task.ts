'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';

export function useArchiveTaskMutation(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { version: number }) => {
      const path = `/projects/${projectId}/tasks/${taskId}/archive`;
      return runOrQueue(
        projectId,
        { path, method: 'POST', json: { version: input.version, reason: 'archived' } },
        async () => {
          const res = await apiFetch(path, {
            method: 'POST',
            json: { version: input.version, reason: 'archived' },
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
