import { useState } from 'react';
import {
  type AdminScenarioTemplate,
  useAdminScenarioTemplatesQuery,
  useAdminUpsertScenarioTemplateMutation,
} from '../../services/admin';
import { ErrorState, LoadingState } from '../../components/States';

export function ScenarioTemplatesPage() {
  const q = useAdminScenarioTemplatesQuery();
  const upsert = useAdminUpsertScenarioTemplateMutation();

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={(q.error as any)?.message} />;

  const items = q.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Scenario Templates</h2>
      </div>

      <div className="space-y-2">
        {items.map((t) => (
          <TemplateCard
            key={t.type}
            item={t}
            saving={upsert.isPending}
            onSave={(next) => upsert.mutate(next)}
          />
        ))}
      </div>

      {upsert.isError ? (
        <div className="text-sm text-rose-700">儲存失敗：{(upsert.error as any)?.message}</div>
      ) : null}
    </div>
  );
}

function TemplateCard(props: {
  item: AdminScenarioTemplate;
  saving: boolean;
  onSave: (next: AdminScenarioTemplate) => void;
}) {
  const [local, setLocal] = useState(props.item);

  return (
    <div className="rounded border p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs">{props.item.type}</div>
        <button
          className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={props.saving}
          onClick={() => props.onSave(local)}
        >
          Save
        </button>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">default_delay_sec</div>
          <input
            className="w-full rounded border px-2 py-1"
            type="number"
            value={local.default_delay_sec}
            onChange={(e) => setLocal((s) => ({ ...s, default_delay_sec: Number(e.target.value) }))}
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={local.enabled}
            onChange={(e) => setLocal((s) => ({ ...s, enabled: e.target.checked }))}
          />
          enabled
        </label>
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">default_error_code</div>
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="(null)"
            value={local.default_error_code ?? ''}
            onChange={(e) => setLocal((s) => ({ ...s, default_error_code: e.target.value ? e.target.value : null }))}
          />
        </label>
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">default_error_message</div>
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="(null)"
            value={local.default_error_message ?? ''}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                default_error_message: e.target.value ? e.target.value : null,
              }))
            }
          />
        </label>
      </div>
    </div>
  );
}
