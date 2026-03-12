import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api-client';

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
  assignees?: Array<{ userId: string }>;
};

export type ProjectMembership = {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  version: number;
  joinedAt: string;
};

export type ProjectSnapshot = {
  project: {
    id: string;
    name: string;
    status: 'active' | 'archived';
    version: number;
  };
  boards: Array<{ id: string; projectId: string; name: string; order: number; status: 'active' | 'archived'; version: number }>;
  lists: Array<{
    id: string;
    boardId: string;
    title: string;
    order: number;
    status: 'active' | 'archived';
    isWipLimited: boolean;
    wipLimit: number | null;
    version: number;
  }>;
  tasks: Task[];
  memberships: ProjectMembership[];
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

type ListCommentsResponse = {
  items: Comment[];
  nextCursor: string | null;
};

export function useProjectSnapshot(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['projects', projectId, 'snapshot'],
    enabled,
    queryFn: async () => {
      const res = await apiFetch<ProjectSnapshot>(`/projects/${projectId}/snapshot`, { method: 'GET' });
      return res.data as ProjectSnapshot;
    },
  });
}

export function useTaskDetailFromSnapshot(projectId: string, taskId: string, enabled: boolean = true) {
  const snapshot = useProjectSnapshot(projectId, enabled);
  const task = snapshot.data?.tasks.find((t) => t.id === taskId) ?? null;
  return { snapshot, task };
}

export function useTaskComments(projectId: string, taskId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['projects', projectId, 'tasks', taskId, 'comments'],
    enabled,
    queryFn: async () => {
      const res = await apiFetch<ListCommentsResponse>(
        `/projects/${projectId}/tasks/${taskId}/comments?limit=50`,
        { method: 'GET' }
      );
      if (!res.data) throw new Error('伺服器回應格式錯誤');
      return res.data.items;
    },
  });
}
