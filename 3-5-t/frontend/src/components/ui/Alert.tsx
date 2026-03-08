export function Alert({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="font-semibold">{title}</div>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
