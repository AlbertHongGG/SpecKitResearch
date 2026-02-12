export function ConflictBanner(props: { message?: string; onReload?: () => void }) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-medium">發生併發衝突（409）</div>
      <div className="mt-1 text-amber-800">{props.message ?? '資料已被其他人更新，請重新載入後再試一次。'}</div>
      {props.onReload ? (
        <button
          type="button"
          className="mt-2 rounded bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
          onClick={props.onReload}
        >
          重新載入
        </button>
      ) : null}
    </div>
  )
}
