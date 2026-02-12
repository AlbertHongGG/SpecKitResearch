import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import { getCsrfToken } from "@/lib/http/csrfClient";

export function useCreateThreadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      boardId: string;
      title: string;
      content: string;
      intent: "save_draft" | "publish";
    }) => {
      const token = await getCsrfToken();
      return fetchJson<{ thread: { id: string } }>("/api/threads", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function usePublishThreadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const token = await getCsrfToken();
      return fetchJson<{ thread: { id: string } }>(`/api/threads/${threadId}/publish`, {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({}),
      });
    },
    onSuccess: async (_data, threadId) => {
      await qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
  });
}
