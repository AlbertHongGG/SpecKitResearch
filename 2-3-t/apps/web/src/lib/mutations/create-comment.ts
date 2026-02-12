'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';
import type { Comment } from '../../components/task/Comments';

export function useCreateCommentMutation(projectId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { content: string }) => {
      const path = `/projects/${projectId}/tasks/${taskId}/comments`;
      return runOrQueue(
        projectId,
        { path, method: 'POST', json: { content: input.content } },
        async () => {
          const res = await apiFetch(path, {
            method: 'POST',
            json: { content: input.content },
          });
          return res.data as Comment;
        }
      );
    },
    onSuccess: async (created) => {
      queryClient.setQueryData(
        ['projects', projectId, 'tasks', taskId, 'comments'],
        (prev: Comment[] | undefined) => [...(prev ?? []), created]
      );
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks', taskId, 'comments'] });
    },
  });
}
