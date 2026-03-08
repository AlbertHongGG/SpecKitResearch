import { useEffect, useMemo, useState } from 'react';
import { useAdminSettingsQuery, useAdminUpdateSettingsMutation, type AdminSettings } from '../../services/admin';
import { ErrorState, LoadingState } from '../../components/States';

export function SettingsPage() {
  const q = useAdminSettingsQuery();
  const save = useAdminUpdateSettingsMutation();

  const [local, setLocal] = useState<AdminSettings | null>(null);
  const [allowedCurrenciesText, setAllowedCurrenciesText] = useState('');

  useEffect(() => {
    if (!q.data) return;
    setLocal(q.data);
    setAllowedCurrenciesText(q.data.allowed_currencies.join(', '));
  }, [q.data]);

  const errorMessage = useMemo(
    () => (save.isError ? (save.error as any)?.message ?? '儲存失敗' : ''),
    [save.isError, save.error],
  );

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={(q.error as any)?.message} />;
  if (!local) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Settings</h2>
        <button
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={save.isPending}
          onClick={() => {
            const allowed = allowedCurrenciesText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            save.mutate({
              ...local,
              allowed_currencies: allowed.length ? allowed : ['TWD'],
            });
          }}
        >
          {save.isPending ? '儲存中…' : '儲存'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">session_ttl_hours</div>
          <input
            className="w-full rounded border px-2 py-1"
            type="number"
            value={local.session_ttl_hours}
            onChange={(e) => setLocal((s) => ({ ...(s as any), session_ttl_hours: Number(e.target.value) }))}
          />
        </label>

        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">default_return_method</div>
          <select
            className="w-full rounded border px-2 py-1"
            value={local.default_return_method}
            onChange={(e) => setLocal((s) => ({ ...(s as any), default_return_method: e.target.value as any }))}
          >
            <option value="query_string">query_string</option>
            <option value="post_form">post_form</option>
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          <div className="mb-1 text-xs text-slate-500">allowed_currencies (comma separated)</div>
          <input
            className="w-full rounded border px-2 py-1"
            value={allowedCurrenciesText}
            onChange={(e) => setAllowedCurrenciesText(e.target.value)}
          />
        </label>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="text-sm font-medium">Webhook Signing</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">active_secret_id</div>
            <input className="w-full rounded border px-2 py-1 font-mono text-xs" readOnly value={local.webhook_signing.active_secret_id} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">previous_secret_id</div>
            <input
              className="w-full rounded border px-2 py-1 font-mono text-xs"
              readOnly
              value={local.webhook_signing.previous_secret_id ?? ''}
              placeholder="(none)"
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">previous_secret_grace_period_hours</div>
            <input
              className="w-full rounded border px-2 py-1"
              type="number"
              value={local.webhook_signing.previous_secret_grace_period_hours}
              onChange={(e) =>
                setLocal((s) => ({
                  ...(s as any),
                  webhook_signing: {
                    ...(s as any).webhook_signing,
                    previous_secret_grace_period_hours: Number(e.target.value),
                  },
                }))
              }
            />
          </label>
        </div>
      </div>

      {errorMessage ? <div className="text-sm text-rose-700">{errorMessage}</div> : null}
    </div>
  );
}
