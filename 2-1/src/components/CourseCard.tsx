import { formatMoneyTWD } from '@/lib/format';

export default function CourseCard(props: {
  courseId: string;
  title: string;
  description: string;
  price: number;
  categoryName?: string | null;
}) {
  return (
    <a
      href={`/courses/${props.courseId}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-900">{props.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{props.description}</p>
          {props.categoryName ? <p className="mt-2 text-xs text-slate-500">{props.categoryName}</p> : null}
        </div>
        <div className="shrink-0 text-sm font-semibold text-slate-900">{formatMoneyTWD(props.price)}</div>
      </div>
    </a>
  );
}
