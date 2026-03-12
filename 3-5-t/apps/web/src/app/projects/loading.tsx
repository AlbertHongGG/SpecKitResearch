export default function ProjectsLoading() {
  return (
    <div>
      <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
