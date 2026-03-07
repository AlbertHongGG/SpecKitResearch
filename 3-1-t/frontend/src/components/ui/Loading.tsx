export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-4 text-sm text-black/70">
      {label}
    </div>
  );
}
