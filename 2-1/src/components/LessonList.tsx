'use client';

export default function LessonList(props: {
  outline: Array<{
    sectionId: string;
    title: string;
    lessons: Array<{ lessonId: string; title: string }>;
  }>;
  completedLessonIds: string[];
  selectedLessonId?: string;
  onSelectLesson: (lessonId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {props.outline.map((s) => (
        <section key={s.sectionId} className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-medium text-slate-900">{s.title}</h3>
          <ul className="mt-2 space-y-1">
            {s.lessons.map((l) => {
              const done = props.completedLessonIds.includes(l.lessonId);
              const active = props.selectedLessonId === l.lessonId;
              return (
                <li key={l.lessonId}>
                  <button
                    className={`w-full rounded px-2 py-1 text-left text-sm ${
                      active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => props.onSelectLesson(l.lessonId)}
                  >
                    {done ? '✓ ' : ''}
                    {l.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
