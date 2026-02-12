import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api-client';
import { runOrQueue } from '../offline/mutation-queue';

export type MoveTaskInput = {
  taskId: string;
  toListId: string;
  beforeTaskId: string | null;
  afterTaskId: string | null;
  expectedVersion: number;
  wipOverride?:
    | {
        enabled: boolean;
        reason?: string | null;
      }
    | null;
};

export type Task = {
  id: string;
  projectId: string;
  boardId: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: number | null;
  position: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';
  version: number;
};

export function useMoveTaskMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MoveTaskInput) => {
      const path = `/projects/${projectId}/tasks/${input.taskId}/move`;
      const json = {
        toListId: input.toListId,
        beforeTaskId: input.beforeTaskId,
        afterTaskId: input.afterTaskId,
        expectedVersion: input.expectedVersion,
        wipOverride: input.wipOverride ?? null,
      };

      return runOrQueue(
        projectId,
        { path, method: 'POST', json },
        async () => {
          const res = await apiFetch(path, {
            method: 'POST',
            json,
          });
          return res.data as Task;
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });
}
