import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import type { ThreadSummary } from "@/lib/queries/threads";

export function usePublicSearch(q: string, page: number) {
  return useQuery({
    queryKey: ["publicSearch", q, page],
    queryFn: () =>
      fetchJson<{ items: ThreadSummary[]; pageInfo: { page: number; pageSize: number; total: number } }>(
        `/api/search?q=${encodeURIComponent(q)}&page=${page}`,
      ),
    enabled: q.trim().length > 0,
  });
}
