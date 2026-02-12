export function ConflictState(props: { message?: string }) {
  return (
    <div className="rounded border bg-white p-6">
      <div className="text-base font-semibold">發生衝突</div>
      <div className="mt-1 text-sm text-slate-600">{props.message ?? '資料已被他人更新，請重新整理。'}</div>
    </div>
  )
}
