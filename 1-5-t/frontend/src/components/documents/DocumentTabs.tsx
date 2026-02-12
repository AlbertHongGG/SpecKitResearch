import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { ApprovalRecord, AuditLog, ReviewTask } from '@internal/contracts';

type TabKey = 'version' | 'attachments' | 'tasks' | 'records';

type Props = {
  title: string;
  status: string;
  currentVersion: { versionNo: number; content: string };
  attachments: Array<{ id: string; filename: string; sizeBytes: number }>;
  reviewTasks: ReviewTask[];
  approvalRecords: ApprovalRecord[];
  auditLogs: AuditLog[];

  versionPanel: ReactNode;
  attachmentsPanel?: ReactNode;
  tasksPanel?: ReactNode;
  recordsPanel?: ReactNode;
};

function TabButton(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        props.active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      {props.label}
    </button>
  );
}

export function DocumentTabs(props: Props) {
  const [tab, setTab] = useState<TabKey>('version');

  const labels = useMemo(() => {
    return {
      version: `版本 #${props.currentVersion.versionNo}`,
      attachments: `附件 (${props.attachments.length})`,
      tasks: `任務 (${props.reviewTasks.length})`,
      records: `紀錄`,
    } as const;
  }, [props.attachments.length, props.currentVersion.versionNo, props.reviewTasks.length]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'version'} onClick={() => setTab('version')} label={labels.version} />
        <TabButton active={tab === 'attachments'} onClick={() => setTab('attachments')} label={labels.attachments} />
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} label={labels.tasks} />
        <TabButton active={tab === 'records'} onClick={() => setTab('records')} label={labels.records} />
      </div>

      <div className="mt-4">
        {tab === 'version' ? props.versionPanel : null}
        {tab === 'attachments' ? props.attachmentsPanel : null}
        {tab === 'tasks' ? props.tasksPanel : null}
        {tab === 'records' ? props.recordsPanel : null}
      </div>
    </div>
  );
}
