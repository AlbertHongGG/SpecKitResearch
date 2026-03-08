export function Loading() {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-gray-100" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
