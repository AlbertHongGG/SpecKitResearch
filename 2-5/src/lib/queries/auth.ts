import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClientError, fetchJson } from "@/lib/http/client";
import { clearCsrfTokenCache, getCsrfToken } from "@/lib/http/csrfClient";

export type MeResponse = {
  user: { id: string; email: string; role: string; isBanned: boolean };
  moderatorBoards: { boardId: string }[];
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<MeResponse | null> => {
      try {
        return await fetchJson<MeResponse>("/api/me");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5_000,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; returnTo?: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ user: MeResponse["user"]; returnTo?: string }>("/api/auth/login", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      clearCsrfTokenCache();
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRegisterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; returnTo?: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ user: MeResponse["user"]; returnTo?: string }>("/api/auth/register", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      clearCsrfTokenCache();
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getCsrfToken();
      return fetchJson<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify({}),
      });
    },
    onSuccess: async () => {
      clearCsrfTokenCache();
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
