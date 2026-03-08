import { useMemo, useState } from 'react';
import { useAdminPaymentMethodsQuery, useAdminUpsertPaymentMethodMutation } from '../../services/admin';
import { ErrorState, LoadingState } from '../../components/States';

export function PaymentMethodsPage() {
  const q = useAdminPaymentMethodsQuery();
  const upsert = useAdminUpsertPaymentMethodMutation();

  const [draft, setDraft] = useState({ code: '', display_name: '', enabled: true, sort_order: 0 });
  const items = q.data ?? [];

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.sort_order - b.sort_order) || a.code.localeCompare(b.code)),
    [items],
  );

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={(q.error as any)?.message} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Payment Methods</h2>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">code</th>
              <th>display_name</th>
              <th>enabled</th>
              <th>sort_order</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <Row
                key={m.code}
                item={m}
                saving={upsert.isPending}
                onSave={(next) => upsert.mutate(next)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4">
        <div className="text-sm font-medium">新增 / 更新</div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1"
            placeholder="code"
            value={draft.code}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="display_name"
            value={draft.display_name}
            onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            />
            enabled
          </label>
          <input
            className="rounded border px-2 py-1"
            type="number"
            placeholder="sort_order"
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
          />
        </div>
        <button
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={upsert.isPending || !draft.code || !draft.display_name}
          onClick={() => upsert.mutate(draft)}
        >
          {upsert.isPending ? '儲存中…' : '儲存'}
        </button>
        {upsert.isError ? (
          <div className="mt-2 text-sm text-rose-700">儲存失敗：{(upsert.error as any)?.message}</div>
        ) : null}
      </div>
    </div>
  );
}

function Row(props: {
  item: { code: string; display_name: string; enabled: boolean; sort_order: number };
  saving: boolean;
  onSave: (next: { code: string; display_name: string; enabled: boolean; sort_order: number }) => void;
}) {
  const [local, setLocal] = useState(props.item);

  return (
    <tr className="border-t">
      <td className="py-2 font-mono text-xs">{props.item.code}</td>
      <td>
        <input
          className="w-full rounded border px-2 py-1"
          value={local.display_name}
          onChange={(e) => setLocal((s) => ({ ...s, display_name: e.target.value }))}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={local.enabled}
          onChange={(e) => setLocal((s) => ({ ...s, enabled: e.target.checked }))}
        />
      </td>
      <td>
        <input
          className="w-24 rounded border px-2 py-1"
          type="number"
          value={local.sort_order}
          onChange={(e) => setLocal((s) => ({ ...s, sort_order: Number(e.target.value) }))}
        />
      </td>
      <td className="text-right">
        <button
          className="rounded bg-white px-3 py-1.5 text-sm border hover:bg-slate-50 disabled:opacity-50"
          disabled={props.saving}
          onClick={() => props.onSave(local)}
        >
          Save
        </button>
      </td>
    </tr>
  );
}
