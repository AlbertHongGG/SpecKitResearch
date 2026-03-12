export default function RootLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-9 w-28 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
