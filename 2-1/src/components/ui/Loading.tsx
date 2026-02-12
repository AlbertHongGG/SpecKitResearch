export function Loading({ label = '載入中…' }: { label?: string }) {
  return <p className="text-sm text-slate-600">{label}</p>;
}
