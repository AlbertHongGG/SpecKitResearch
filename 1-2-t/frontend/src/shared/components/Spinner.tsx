export function Spinner({ label = '載入中…' }: { label?: string }) {
  return <div className="p-6 text-sm text-slate-600">{label}</div>;
}
