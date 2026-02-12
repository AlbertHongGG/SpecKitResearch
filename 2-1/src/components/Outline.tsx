export default function Outline(props: {
  outline: Array<{
    sectionId: string;
    title: string;
    lessons: Array<{ lessonId: string; title: string }>;
  }>;
}) {
  return (
    <div className="space-y-4">
      {props.outline.map((s) => (
        <section key={s.sectionId} className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-medium text-slate-900">{s.title}</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {s.lessons.map((l) => (
              <li key={l.lessonId}>{l.title}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
