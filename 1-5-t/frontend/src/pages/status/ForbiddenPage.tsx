export function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold">沒有權限</div>
        <div className="mt-2 text-sm text-slate-600">你沒有權限存取這個頁面。</div>
      </div>
    </div>
  );
}
