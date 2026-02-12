"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/src/ui/api/client";

type SessionMeResponse = {
  authenticated: boolean;
  user?: { id: string; email: string; role: "user" | "admin"; isBanned: boolean };
  moderatorBoards?: string[];
};

export function useSession() {
  return useQuery({
    queryKey: ["session", "me"],
    queryFn: async (): Promise<SessionMeResponse> => {
      return apiFetch<SessionMeResponse>("/api/session/me", { method: "GET" });
    },
    staleTime: 5_000,
  });
}
