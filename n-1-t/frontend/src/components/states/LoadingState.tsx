export function LoadingState({ label }: { label?: string }) {
  return <div className="text-slate-600">{label ?? '載入中…'}</div>;
}
