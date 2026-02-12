import { formatMoneyTWD } from '@/lib/format';

export default function MyCourseCard(props: {
  courseId: string;
  title: string;
  description: string;
  price: number;
  progress: { completedLessons: number; totalLessons: number };
}) {
  const pct = props.progress.totalLessons
    ? Math.round((props.progress.completedLessons / props.progress.totalLessons) * 100)
    : 0;

  return (
    <a
      href={`/my-courses/${props.courseId}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-900">{props.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{props.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            進度：{props.progress.completedLessons}/{props.progress.totalLessons}（{pct}%）
          </p>
        </div>
        <div className="shrink-0 text-sm font-semibold text-slate-900">{formatMoneyTWD(props.price)}</div>
      </div>
    </a>
  );
}
