import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";

export type Board = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: () => fetchJson<{ boards: Board[] }>("/api/boards"),
  });
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchJson<{ board: Board; permissions: { canPost: boolean; canModerate: boolean } }>(`/api/boards/${boardId}`),
    enabled: !!boardId,
  });
}
