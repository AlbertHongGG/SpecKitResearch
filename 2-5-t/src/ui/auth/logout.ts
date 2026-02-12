import { apiFetch } from "@/src/ui/api/client";

export async function logout() {
  await apiFetch<unknown>("/api/auth/logout", { method: "POST" });
}
