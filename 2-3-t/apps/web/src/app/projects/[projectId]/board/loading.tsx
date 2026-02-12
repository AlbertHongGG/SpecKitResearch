export default function BoardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-10 w-56 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 space-y-2">
              <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
