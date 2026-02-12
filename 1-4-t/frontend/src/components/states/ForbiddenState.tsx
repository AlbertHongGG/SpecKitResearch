export function ForbiddenState() {
  return (
    <div className="rounded border bg-white p-6">
      <div className="text-base font-semibold">沒有權限</div>
      <div className="mt-1 text-sm text-slate-600">你沒有權限存取此頁面。</div>
    </div>
  )
}
