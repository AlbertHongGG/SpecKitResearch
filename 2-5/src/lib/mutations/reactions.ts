import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import { getCsrfToken } from "@/lib/http/csrfClient";

export function useToggleThreadLike(threadId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (nextLiked: boolean) => {
      const token = await getCsrfToken();
      return fetchJson<{ liked: boolean }>("/api/likes", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({
          targetType: "thread",
          targetId: threadId,
          action: nextLiked ? "like" : "unlike",
        }),
      });
    },
    onMutate: async (nextLiked) => {
      await qc.cancelQueries({ queryKey: ["thread", threadId] });
      const prev = qc.getQueryData<any>(["thread", threadId]);
      qc.setQueryData(["thread", threadId], (cur: any) => {
        if (!cur) return cur;
        return {
          ...cur,
          reactions: {
            ...(cur.reactions ?? {}),
            liked: nextLiked,
          },
        };
      });
      return { prev };
    },
    onError: (_err, _nextLiked, ctx) => {
      if (ctx?.prev) qc.setQueryData(["thread", threadId], ctx.prev);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
  });
}

export function useToggleThreadFavorite(threadId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (nextFavorited: boolean) => {
      const token = await getCsrfToken();
      return fetchJson<{ favorited: boolean }>("/api/favorites", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({
          threadId,
          action: nextFavorited ? "favorite" : "unfavorite",
        }),
      });
    },
    onMutate: async (nextFavorited) => {
      await qc.cancelQueries({ queryKey: ["thread", threadId] });
      const prev = qc.getQueryData<any>(["thread", threadId]);
      qc.setQueryData(["thread", threadId], (cur: any) => {
        if (!cur) return cur;
        return {
          ...cur,
          reactions: {
            ...(cur.reactions ?? {}),
            favorited: nextFavorited,
          },
        };
      });
      return { prev };
    },
    onError: (_err, _nextFavorited, ctx) => {
      if (ctx?.prev) qc.setQueryData(["thread", threadId], ctx.prev);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
  });
}
