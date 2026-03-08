'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchAuditLogs, type AuditLogRow } from '@/features/admin/admin.queries';

function toIsoEndOfMinute(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  d.setSeconds(59, 999);
  return d.toISOString();
}

function toIsoStart(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function nowLocalMinute(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdminAuditLogsPage() {
  const toDefault = useMemo(() => nowLocalMinute(), []);
  const fromDefault = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    d.setSeconds(0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(toDefault);
  const [actorRole, setActorRole] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');

  const query = useQuery({
    queryKey: ['audit-logs', { from, to, actorRole, actorUserId, action, targetType, targetId }],
    queryFn: () =>
      fetchAuditLogs({
        from: toIsoStart(from),
        to: toIsoEndOfMinute(to),
        actor_role: actorRole.trim() || undefined,
        actor_user_id: actorUserId.trim() || undefined,
        action: action.trim() || undefined,
        target_type: targetType.trim() || undefined,
        target_id: targetId.trim() || undefined,
      }),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">查詢敏感操作稽核紀錄。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 lg:grid-cols-6">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">From</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">To</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Actor role</span>
            <input
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="admin"
            />
          </label>
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Actor user id</span>
            <input
              value={actorUserId}
              onChange={(e) => setActorUserId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Action</span>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="api_key.revoke"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Target type</span>
            <input
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="api_key"
            />
          </label>
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Target id</span>
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="uuid"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {query.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {query.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">載入失敗</div>
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">沒有符合條件的紀錄。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">時間</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((r: AuditLogRow) => (
                  <tr key={r.audit_log_id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="font-medium">{r.actor_role}</span>
                      <span className="ml-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">{r.actor_user_id ?? '-'}</span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">{r.action}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">
                      {r.target_type} {r.target_id ?? ''}
                    </td>
                    <td className="py-2 pr-3">
                      <pre className="max-w-[64ch] whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                        {r.metadata ? JSON.stringify(r.metadata, null, 2) : ''}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
