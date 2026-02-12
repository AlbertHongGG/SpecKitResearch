import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";

export type ThreadSummary = {
  id: string;
  boardId: string;
  title: string;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ThreadDetail = ThreadSummary & {
  content: string;
  authorId: string;
};

export type ThreadViewerInfo = {
  canReply: boolean;
  canEdit: boolean;
  canModerate: boolean;
};

export type ThreadReactions = {
  liked: boolean;
  favorited: boolean;
};

export type ThreadBoardInfo = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export function useThreadsByBoard(boardId: string, page: number) {
  return useQuery({
    queryKey: ["threadsByBoard", boardId, page],
    queryFn: () =>
      fetchJson<{ items: ThreadSummary[]; pageInfo: { page: number; pageSize: number; total: number } }>(
        `/api/boards/${boardId}/threads?page=${page}`,
      ),
    enabled: !!boardId,
  });
}

export function useThread(threadId: string) {
  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: () =>
      fetchJson<{ board: ThreadBoardInfo; thread: ThreadDetail; viewer: ThreadViewerInfo; reactions: ThreadReactions }>(
        `/api/threads/${threadId}`,
      ),
    enabled: !!threadId,
  });
}
