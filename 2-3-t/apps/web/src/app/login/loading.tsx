export default function LoginLoading() {
  return (
    <div className="mx-auto max-w-md">
      <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-20 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
