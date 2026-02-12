export function PlaceholderPage(props: { title: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <p className="mt-2 text-sm text-slate-600">此頁面將在後續任務完成。</p>
    </div>
  );
}
