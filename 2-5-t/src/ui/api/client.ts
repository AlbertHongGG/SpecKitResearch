"use client";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/src/lib/http/cookieNames";

export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(input: { code: string; message: string; requestId?: string; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = decodeURIComponent(p.slice(0, i));
    if (k !== name) continue;
    return decodeURIComponent(p.slice(i + 1));
  }
  return null;
}

async function ensureCsrfCookie() {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  const res = await fetch("/api/csrf", { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error("Failed to mint CSRF token");
  const json = (await res.json()) as { token?: string };
  return json.token ?? readCookie(CSRF_COOKIE_NAME);
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await ensureCsrfCookie();
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const apiError = payload as ApiErrorShape | null;
    if (apiError && typeof apiError === "object" && apiError.error) {
      throw new ApiError(apiError.error);
    }
    throw new Error(typeof payload === "string" ? payload : `HTTP ${res.status}`);
  }

  return payload as T;
}
