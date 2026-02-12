import type { Transaction } from '../../services/transactions';

type Group = {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
  items: Transaction[];
};

function groupByDate(items: Transaction[]): Group[] {
  const map = new Map<string, Group>();

  for (const t of items) {
    const g = map.get(t.date) ?? {
      date: t.date,
      incomeTotal: 0,
      expenseTotal: 0,
      items: [],
    };

    g.items.push(t);
    if (t.type === 'income') g.incomeTotal += t.amount;
    else g.expenseTotal += t.amount;

    map.set(t.date, g);
  }

  // API sorts desc; keep that order.
  const dates = Array.from(map.keys());
  return dates.map((d) => map.get(d)!);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('zh-TW').format(amount);
}

export function TransactionGroupList(props: {
  items: Transaction[];
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}) {
  const groups = groupByDate(props.items);

  return (
    <div className="space-y-4" aria-label="帳務列表">
      {groups.map((g) => (
        <section key={g.date} className="rounded border bg-white">
          <header className="flex flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{g.date}</h2>
            <div className="flex gap-4 text-xs text-slate-700">
              <span aria-label="當日收入">收入 {formatMoney(g.incomeTotal)}</span>
              <span aria-label="當日支出">支出 {formatMoney(g.expenseTotal)}</span>
            </div>
          </header>

          <ul className="divide-y" aria-label={`帳務 ${g.date}`}>
            {g.items.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900">{t.categoryName}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {t.type === 'income' ? '收入' : '支出'}
                    {t.note ? ` · ${t.note}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-sm font-semibold text-slate-900" aria-label="金額">
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount)}
                  </div>

                  {props.onEdit || props.onDelete ? (
                    <div className="flex gap-2">
                      {props.onEdit ? (
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => props.onEdit?.(t)}
                          aria-label="編輯"
                        >
                          編輯
                        </button>
                      ) : null}
                      {props.onDelete ? (
                        <button
                          type="button"
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => props.onDelete?.(t)}
                          aria-label="刪除"
                        >
                          刪除
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
