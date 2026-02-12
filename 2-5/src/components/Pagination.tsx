"use client";

export function Pagination(props: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  const canPrev = props.page > 1;
  const canNext = props.page < totalPages;

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <button
        className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50"
        onClick={() => props.onChange(props.page - 1)}
        disabled={!canPrev}
      >
        上一頁
      </button>
      <div className="text-sm text-slate-600">
        第 {props.page} / {totalPages} 頁
      </div>
      <button
        className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50"
        onClick={() => props.onChange(props.page + 1)}
        disabled={!canNext}
      >
        下一頁
      </button>
    </div>
  );
}
