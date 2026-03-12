'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';

export function useSetTaskAssigneesMutation(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { version: number; assigneeIds: string[] }) => {
      const path = `/projects/${projectId}/tasks/${taskId}/assignees`;
      return runOrQueue(
        projectId,
        { path, method: 'POST', json: { version: input.version, assigneeIds: input.assigneeIds } },
        async () => {
          const res = await apiFetch(path, {
            method: 'POST',
            json: { version: input.version, assigneeIds: input.assigneeIds },
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
