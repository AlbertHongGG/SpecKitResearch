import type { QueryClient } from '@tanstack/react-query';
import type { ProjectSnapshot } from '../queries/task';

export function applySnapshot(queryClient: QueryClient, projectId: string, payload: ProjectSnapshot) {
  queryClient.setQueryData(['projects', projectId, 'snapshot'], payload);
}
