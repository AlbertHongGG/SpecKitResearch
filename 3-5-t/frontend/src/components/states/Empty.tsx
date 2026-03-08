export function Empty({ title = 'No data', hint }: { title?: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6" role="status" aria-live="polite">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint ? <p className="mt-2 text-sm text-gray-600">{hint}</p> : null}
    </div>
  );
}
