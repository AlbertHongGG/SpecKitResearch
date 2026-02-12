import { fetchJson } from "@/lib/http/client";

let cached: { token: string; at: number } | null = null;
const TTL_MS = 1000 * 60 * 10;

export function clearCsrfTokenCache() {
  cached = null;
}

export async function getCsrfToken() {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.token;

  const { token } = await fetchJson<{ token: string }>("/api/csrf");
  cached = { token, at: now };
  return token;
}
