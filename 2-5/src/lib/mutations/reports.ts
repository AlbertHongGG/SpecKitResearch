import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import { getCsrfToken } from "@/lib/http/csrfClient";

export function useCreateReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { targetType: "thread" | "post"; targetId: string; reason: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ created: boolean; report: { id: string; status: string } }>("/api/reports", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async (_data, vars) => {
      // Report creation affects moderation queues.
      if (vars.targetType === "thread") {
        await qc.invalidateQueries({ queryKey: ["thread", vars.targetId] });
      }
      await qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useResolveReportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reportId: string; outcome: "accepted" | "rejected"; note?: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ report: { id: string; status: string } }>(`/api/reports/${input.reportId}/resolve`, {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({ outcome: input.outcome, note: input.note }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reports"] });
      await qc.invalidateQueries({ queryKey: ["thread"] });
    },
  });
}

export function useThreadModerationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | { threadId: string; action: "hide" | "restore" | "lock" | "unlock" }
        | { threadId: string; action: "pinned"; pinned: boolean }
        | { threadId: string; action: "featured"; featured: boolean },
    ) => {
      const token = await getCsrfToken();
      const body =
        input.action === "pinned"
          ? { pinned: input.pinned }
          : input.action === "featured"
            ? { featured: input.featured }
            : {};
      return fetchJson<{ ok: boolean }>(`/api/threads/${input.threadId}/moderation/${input.action}`, {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(body),
      });
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["thread", vars.threadId] });
      await qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function usePostModerationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; action: "hide" | "restore" }) => {
      const token = await getCsrfToken();
      return fetchJson<{ ok: boolean }>(`/api/posts/${input.postId}/moderation/${input.action}`, {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({}),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["reports"] });
      await qc.invalidateQueries({ queryKey: ["thread"] });
    },
  });
}
