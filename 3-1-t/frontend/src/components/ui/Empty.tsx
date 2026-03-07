export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-black/20 bg-white p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="mt-2 text-xs text-black/60">{hint}</p> : null}
    </div>
  );
}
