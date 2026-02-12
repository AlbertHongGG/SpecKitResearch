import type { DocumentDetail } from '../services/documents';
import { SafeText } from './SafeText';

function JsonPreview(props: { value: unknown }) {
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
      {JSON.stringify(props.value, null, 2)}
    </pre>
  );
}

export function DocumentTimelinePanels(props: { document: DocumentDetail }) {
  const d = props.document;

  return (
    <div className="divide-y divide-slate-200">
      <section className="p-4">
        <div className="text-sm font-semibold">版本</div>
        <div className="mt-2 space-y-3">
          {d.versions.map((v) => (
            <div key={v.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  v{v.versionNo} · {v.kind}
                </div>
                <div className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-xs text-slate-600">附件：{v.attachments.length} 件</div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4">
        <div className="text-sm font-semibold">審核待辦</div>
        {d.reviewTasks.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">尚無待辦。</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {d.reviewTasks.map((t) => (
              <li key={t.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{t.stepKey}</div>
                  <div className="text-xs text-slate-600">
                    {t.status} · {t.mode}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">Assignee：{t.assignee.email}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-4">
        <div className="text-sm font-semibold">簽核紀錄</div>
        {d.approvalRecords.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">尚無簽核紀錄。</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {d.approvalRecords.map((r) => (
              <li key={r.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{r.action}</div>
                  <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-xs text-slate-600">Actor：{r.actor.email}</div>
                {r.reason ? (
                  <div className="mt-2 text-sm text-slate-800">
                    理由：<SafeText value={r.reason} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-4">
        <div className="text-sm font-semibold">稽核</div>
        {d.auditLogs.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">尚無稽核紀錄。</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {d.auditLogs.map((l) => (
              <li key={l.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{l.action}</div>
                  <div className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-2">
                  <JsonPreview value={l.metadata} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
