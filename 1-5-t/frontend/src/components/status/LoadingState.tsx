import { Spinner } from '../ui/Spinner';

export function LoadingState(props: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-600">
      <Spinner />
      <div className="text-sm">{props.label ?? '載入中…'}</div>
    </div>
  );
}
