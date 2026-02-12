export default function LessonContentViewer(props: {
  lesson:
    | null
    | {
        lessonId: string;
        title: string;
        contentType: string;
        contentText: string | null;
        contentImageUrl: string | null;
        contentFileUrl: string | null;
      };
}) {
  if (!props.lesson) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">沒有內容</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">{props.lesson.title}</h2>

      {props.lesson.contentType === 'text' ? (
        <div className="prose mt-4 max-w-none whitespace-pre-wrap text-slate-800">
          {props.lesson.contentText ?? ''}
        </div>
      ) : null}

      {props.lesson.contentType === 'image' && props.lesson.contentImageUrl ? (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.lesson.contentImageUrl} alt={props.lesson.title} className="max-w-full rounded" />
        </div>
      ) : null}

      {props.lesson.contentType === 'pdf' && props.lesson.contentFileUrl ? (
        <div className="mt-4">
          <a className="text-sm text-blue-700 underline" href={props.lesson.contentFileUrl} target="_blank">
            開啟 PDF
          </a>
        </div>
      ) : null}
    </div>
  );
}
