import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";

export type Post = {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function usePostsByThread(threadId: string, page: number) {
  return useQuery({
    queryKey: ["postsByThread", threadId, page],
    queryFn: () =>
      fetchJson<{ items: Post[]; pageInfo: { page: number; pageSize: number; total: number } }>(
        `/api/threads/${threadId}/posts?page=${page}`,
      ),
    enabled: !!threadId,
  });
}
