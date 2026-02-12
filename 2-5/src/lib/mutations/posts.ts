import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import { getCsrfToken } from "@/lib/http/csrfClient";

export function useCreatePostMutation(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ post: { id: string } }>("/api/posts", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({ threadId, content: input.content }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["postsByThread", threadId] });
    },
  });
}
