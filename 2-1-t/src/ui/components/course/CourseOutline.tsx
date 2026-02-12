'use client';

export type CourseOutlineSection = {
  id: string;
  title: string;
  order: number;
  lessons: { title: string; order: number }[];
};

export function CourseOutline({ outline }: { outline: CourseOutlineSection[] }) {
  return (
    <div className="space-y-3">
      {outline.map((s) => (
        <div key={s.id} className="rounded border border-slate-200 p-3">
          <div className="text-sm font-medium">
            {s.order}. {s.title}
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {s.lessons.map((l) => (
              <li key={`${s.id}-${l.order}`}>{l.title}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
