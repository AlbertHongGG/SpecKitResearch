export function PlaceholderPage(props: { title: string }) {
  return (
    <section className="rounded border bg-white p-6">
      <h1 className="text-lg font-semibold">{props.title}</h1>
      <p className="mt-2 text-sm text-slate-600">此頁面將在後續任務中實作。</p>
    </section>
  );
}
