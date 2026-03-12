'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';
import type { TaskStatus } from '../../components/task/TaskStatusControl';

export function useChangeTaskStatusMutation(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { version: number; toStatus: TaskStatus }) => {
      const path = `/projects/${projectId}/tasks/${taskId}/status`;
      return runOrQueue(
        projectId,
        { path, method: 'POST', json: { version: input.version, toStatus: input.toStatus } },
        async () => {
          const res = await apiFetch(path, {
            method: 'POST',
            json: { version: input.version, toStatus: input.toStatus },
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
