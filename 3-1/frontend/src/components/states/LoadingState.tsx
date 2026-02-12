export function LoadingState({ label = '載入中…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600" role="status" aria-live="polite">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-neutral-300" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
