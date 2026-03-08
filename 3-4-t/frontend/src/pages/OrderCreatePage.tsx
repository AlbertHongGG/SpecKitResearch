import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrdersCreateRequest, ReturnMethod, SimulationScenarioType } from '@app/contracts';
import { useCreateOrderMutation } from '../services/orders';
import { useMeQuery } from '../services/auth';
import {
  useAdminPaymentMethodsQuery,
  useAdminScenarioTemplatesQuery,
  useAdminSettingsQuery,
} from '../services/admin';

export function OrderCreatePage() {
  const navigate = useNavigate();
  const me = useMeQuery();
  const m = useCreateOrderMutation();

  const isAdmin = Boolean(me.data?.authenticated && me.data?.role === 'ADMIN');
  const methodsQ = useAdminPaymentMethodsQuery({ enabled: isAdmin });
  const scenariosQ = useAdminScenarioTemplatesQuery({ enabled: isAdmin });
  const settingsQ = useAdminSettingsQuery({ enabled: isAdmin });

  const [form, setForm] = useState<OrdersCreateRequest>({
    amount: 100,
    currency: 'TWD',
    callback_url: 'http://localhost:4000/callback',
    webhook_url: null,
    payment_method_code: 'card',
    simulation_scenario_type: 'success' as SimulationScenarioType,
    delay_sec: 0,
    webhook_delay_sec: null,
    error_code: null,
    error_message: null,
    return_method: 'query_string' as ReturnMethod,
  });

  // Apply admin-managed defaults once the admin data is loaded.
  useEffect(() => {
    if (!isAdmin) return;
    if (!methodsQ.data || !scenariosQ.data || !settingsQ.data) return;

    const enabledMethods = methodsQ.data.filter((m) => m.enabled).sort((a, b) => a.sort_order - b.sort_order);
    const enabledScenarios = scenariosQ.data.filter((s) => s.enabled);

    setForm((f) => {
      const nextCurrency = settingsQ.data.allowed_currencies[0] ?? f.currency ?? 'TWD';
      const nextReturnMethod = (settingsQ.data.default_return_method ?? f.return_method) as any;
      const nextPaymentMethod = enabledMethods[0]?.code ?? f.payment_method_code;
      const nextScenario = (enabledScenarios[0]?.type ?? f.simulation_scenario_type) as any;
      return {
        ...f,
        currency: nextCurrency,
        return_method: nextReturnMethod,
        payment_method_code: nextPaymentMethod,
        simulation_scenario_type: nextScenario,
      };
    });
  }, [isAdmin, methodsQ.data, scenariosQ.data, settingsQ.data]);

  // When scenario changes in admin mode, apply template defaults (still user-overridable afterwards).
  useEffect(() => {
    if (!isAdmin) return;
    if (!scenariosQ.data) return;
    const t = scenariosQ.data.find((s) => s.type === form.simulation_scenario_type);
    if (!t) return;
    setForm((f) => ({
      ...f,
      delay_sec: t.default_delay_sec,
      error_code: t.default_error_code,
      error_message: t.default_error_message,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, form.simulation_scenario_type]);

  const disabled = m.isPending;
  const errorMessage = useMemo(() => (m.isError ? (m.error as any)?.message ?? '建立失敗' : ''), [m.isError, m.error]);

  const adminReady = !isAdmin || (methodsQ.data && scenariosQ.data && settingsQ.data);
  const enabledMethods = (methodsQ.data ?? []).filter((m) => m.enabled).sort((a, b) => a.sort_order - b.sort_order);
  const enabledScenarios = (scenariosQ.data ?? []).filter((s) => s.enabled);
  const allowedCurrencies = settingsQ.data?.allowed_currencies ?? ['TWD'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">新增訂單</h1>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        {!adminReady ? <div className="mb-3 text-sm text-slate-600">載入 Admin 設定中…</div> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">amount</div>
            <input
              className="w-full rounded border px-2 py-1"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">currency</div>
            {isAdmin ? (
              <select
                className="w-full rounded border px-2 py-1"
                value={form.currency ?? 'TWD'}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {allowedCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded border px-2 py-1"
                value={form.currency ?? 'TWD'}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            )}
          </label>

          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-slate-500">callback_url</div>
            <input
              className="w-full rounded border px-2 py-1"
              value={form.callback_url}
              onChange={(e) => setForm((f) => ({ ...f, callback_url: e.target.value }))}
            />
          </label>

          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-slate-500">webhook_url (optional)</div>
            <input
              className="w-full rounded border px-2 py-1"
              placeholder="(empty)"
              value={form.webhook_url ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value ? e.target.value : null }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">payment_method_code</div>
            {isAdmin ? (
              <select
                className="w-full rounded border px-2 py-1"
                value={form.payment_method_code}
                onChange={(e) => setForm((f) => ({ ...f, payment_method_code: e.target.value }))}
              >
                {enabledMethods.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.display_name} ({m.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded border px-2 py-1"
                value={form.payment_method_code}
                onChange={(e) => setForm((f) => ({ ...f, payment_method_code: e.target.value }))}
              />
            )}
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">simulation_scenario_type</div>
            <select
              className="w-full rounded border px-2 py-1"
              value={form.simulation_scenario_type}
              onChange={(e) => setForm((f) => ({ ...f, simulation_scenario_type: e.target.value as any }))}
            >
              {(isAdmin ? enabledScenarios.map((s) => s.type) : (['success', 'delayed_success', 'failed', 'cancelled', 'timeout'] as const)).map(
                (v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">delay_sec</div>
            <input
              className="w-full rounded border px-2 py-1"
              type="number"
              value={form.delay_sec ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, delay_sec: Number(e.target.value) }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">return_method</div>
            <select
              className="w-full rounded border px-2 py-1"
              value={form.return_method ?? 'query_string'}
              onChange={(e) => setForm((f) => ({ ...f, return_method: e.target.value as any }))}
            >
              <option value="query_string">query_string</option>
              <option value="post_form">post_form</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">error_code (optional)</div>
            <input
              className="w-full rounded border px-2 py-1"
              value={form.error_code ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, error_code: e.target.value ? e.target.value : null }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-slate-500">error_message (optional)</div>
            <input
              className="w-full rounded border px-2 py-1"
              value={form.error_message ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, error_message: e.target.value ? e.target.value : null }))}
            />
          </label>
        </div>

        {errorMessage ? <div className="mt-3 text-sm text-rose-700">{errorMessage}</div> : null}

        <div className="mt-4 flex gap-2">
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={disabled}
            onClick={async () => {
              const res = await m.mutateAsync(form);
              navigate(`/pay/${res.order.order_no}`);
            }}
          >
            {m.isPending ? '建立中…' : '建立並前往付款頁'}
          </button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => navigate('/orders')}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
