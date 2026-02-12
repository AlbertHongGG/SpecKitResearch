import type { ApiClientError } from "@/lib/http/client";

export function ErrorBanner({ error }: { error: unknown }) {
  const e = error as Partial<ApiClientError> | null;
  const message = (e && typeof e.message === "string" && e.message) || "發生錯誤";
  const code = (e && typeof (e as any).code === "string" && (e as any).code) || undefined;
  const requestId = (e && typeof (e as any).requestId === "string" && (e as any).requestId) || undefined;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <div className="font-medium">{message}</div>
      <div className="mt-1 text-xs text-red-800">
        {code ? `code=${code} ` : ""}
        {requestId ? `requestId=${requestId}` : ""}
      </div>
    </div>
  );
}
