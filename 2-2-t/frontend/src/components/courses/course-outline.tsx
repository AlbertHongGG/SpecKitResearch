import type { CourseMarketingDetail } from '@app/contracts';

export function CourseOutline({ outline }: { outline: CourseMarketingDetail['outline'] }) {
  return (
    <div className="space-y-4">
      {outline.map((s) => (
        <div key={`${s.sectionOrder}-${s.sectionTitle}`} className="rounded-md border p-4">
          <div className="font-medium">
            {s.sectionOrder}. {s.sectionTitle}
          </div>
          <ol className="mt-2 space-y-1 text-sm text-gray-700">
            {s.lessons
              .slice()
              .sort((a, b) => a.lessonOrder - b.lessonOrder)
              .map((l) => (
                <li key={l.lessonId} className="flex gap-2">
                  <span className="w-8 text-gray-500">{l.lessonOrder}.</span>
                  <span>{l.lessonTitle}</span>
                </li>
              ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
