import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";

export type ReportListItem =
  | {
      report: {
        id: string;
        reporterId: string;
        targetType: "thread";
        targetId: string;
        reason: string;
        status: string;
        createdAt: string;
      };
      thread: { id: string; title: string; status: string };
    }
  | {
      report: {
        id: string;
        reporterId: string;
        targetType: "post";
        targetId: string;
        reason: string;
        status: string;
        createdAt: string;
      };
      thread: { id: string; title: string; status: string };
      post: { id: string; content: string; status: string };
    };

export function useReportsByBoard(params: {
  boardId: string;
  status?: "pending" | "accepted" | "rejected";
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["reports", params.boardId, params.status ?? "all", params.page, params.pageSize],
    queryFn: async (): Promise<{ items: ReportListItem[]; pageInfo: { page: number; pageSize: number; total: number } }> => {
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.status) qs.set("status", params.status);
      return fetchJson(`/api/boards/${params.boardId}/reports?${qs.toString()}`);
    },
  });
}
