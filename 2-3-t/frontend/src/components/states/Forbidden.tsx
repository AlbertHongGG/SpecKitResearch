export function Forbidden() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6" role="status" aria-live="polite">
      <h1 className="text-lg font-semibold">403 Forbidden</h1>
      <p className="mt-2 text-sm text-gray-600">你沒有權限存取此頁面。</p>
    </div>
  );
}
