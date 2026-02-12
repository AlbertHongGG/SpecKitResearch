export function Loading({ label }: { label?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        <div>{label ?? "載入中…"}</div>
      </div>
      <div className="mt-3 space-y-2 animate-pulse">
        <div className="h-3 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  );
}
