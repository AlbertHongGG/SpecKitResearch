import { type ReactNode, useMemo, useState } from 'react';

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function LogsTable<T>(props: {
  items: T[];
  columns: Array<Column<T>>;
  pageSize?: number;
  emptyText?: string;
}) {
  const pageSize = props.pageSize ?? 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(props.items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return props.items.slice(start, start + pageSize);
  }, [props.items, safePage, pageSize]);

  if (props.items.length === 0) {
    return <div className="text-sm text-slate-600">{props.emptyText ?? 'No logs'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {props.columns.map((c, idx) => (
                <th key={idx} className={['px-3 py-2', c.className].filter(Boolean).join(' ')}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((row, rIdx) => (
              <tr key={rIdx} className="border-t">
                {props.columns.map((c, cIdx) => (
                  <td key={cIdx} className={['px-3 py-2 align-top', c.className].filter(Boolean).join(' ')}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Page {safePage} / {totalPages} ({props.items.length} items)
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              type="button"
            >
              Prev
            </button>
            <button
              className="rounded border bg-white px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
