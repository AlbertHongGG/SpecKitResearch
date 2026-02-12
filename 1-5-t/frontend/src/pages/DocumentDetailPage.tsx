import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import { useSession } from '../auth/useSession';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/status/ErrorState';
import { Button } from '../components/ui/Button';
import { DraftEditorForm } from '../components/documents/DraftEditorForm';
import { AttachmentUploader } from '../components/documents/AttachmentUploader';
import { SubmitForApprovalPanel } from '../components/documents/SubmitForApprovalPanel';
import { DocumentStatusBadge } from '../components/documents/DocumentStatusBadge';
import { ReviewActionPanel } from '../components/reviews/ReviewActionPanel';
import { DocumentTabs } from '../components/documents/DocumentTabs';
import { useToast } from '../components/toast/ToastContext';

export function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId ?? '';
  const session = useSession();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: ['documents', 'detail', documentId],
    queryFn: () => documentsApi.detail(documentId),
    enabled: Boolean(documentId),
  });

  const reopenMutation = useMutation({
    mutationFn: () => documentsApi.reopenAsDraft(documentId),
    onSuccess: async () => {
      await detailQuery.refetch();
      toast.success('已轉回 Draft');
    },
    onError: (e) => {
      toast.error('操作失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => documentsApi.archive(documentId),
    onSuccess: async () => {
      await detailQuery.refetch();
      toast.info('文件已封存');
    },
    onError: (e) => {
      toast.error('封存失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (detailQuery.error) {
    return <ErrorState title="載入詳情失敗" error={detailQuery.error} />;
  }

  const doc = detailQuery.data?.document;
  if (!doc) {
    return <ErrorState title="載入詳情失敗" error={new Error('Missing document')} />;
  }

  const currentVersion = doc.currentVersion;
  const attachments = doc.attachments;
  const tasks = doc.reviewTasks;
  const approvalRecords = doc.approvalRecords;
  const auditLogs = doc.auditLogs;

  const myPendingTasks =
    session.user?.role === 'Reviewer'
      ? tasks.filter((t) => t.assigneeId === session.user?.id && t.status === 'Pending')
      : [];

  const isDraft = doc.status === 'Draft';
  const canArchive = session.user?.role === 'Admin' && doc.status === 'Approved';

  const attachmentsPanel = (
    <div className="space-y-4">
      {isDraft ? (
        <AttachmentUploader documentId={doc.id} disabled={false} onUploaded={() => detailQuery.refetch()} />
      ) : null}

      <div>
        <div className="text-sm font-medium">附件清單</div>
        {attachments.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">無</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {attachments.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>{a.filename}</span>
                <span className="text-slate-500">{a.sizeBytes} bytes</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const tasksPanel = (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">審核任務</div>
        {tasks.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">無</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>
                  {t.stepKey} · {t.status}
                </span>
                <span className="text-slate-500">{t.mode}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {myPendingTasks.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-medium">我的待辦</div>
          {myPendingTasks.map((t) => (
            <div key={t.id} className="space-y-2">
              <div className="text-sm text-slate-700">
                待辦：{t.stepKey}（{t.mode}）
              </div>
              <ReviewActionPanel reviewTaskId={t.id} onDone={async () => {
                await detailQuery.refetch();
              }} />
            </div>
          ))}
        </div>
      ) : null}

      {isDraft ? (
        <SubmitForApprovalPanel documentId={doc.id} disabled={false} onSubmitted={() => detailQuery.refetch()} />
      ) : null}
    </div>
  );

  const recordsPanel = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold">審核紀錄</div>
        {approvalRecords.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">無</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {approvalRecords.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>
                  {r.action}
                  {r.reason ? `：${r.reason}` : ''}
                </span>
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold">稽核紀錄</div>
        {auditLogs.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">無</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {auditLogs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span>{l.action}</span>
                <span className="text-slate-500">{new Date(l.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{doc.title}</div>
            <div className="mt-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <DocumentStatusBadge status={doc.status} />
                <span>版本：{currentVersion.versionNo}</span>
              </span>
            </div>
          </div>
          {doc.status === 'Rejected' ? (
            <Button loading={reopenMutation.isPending} onClick={() => reopenMutation.mutate()}>
              退回後修改
            </Button>
          ) : canArchive ? (
            <Button variant="secondary" loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate()}>
              封存
            </Button>
          ) : null}
        </div>

        {doc.status === 'Archived' ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            此文件已封存，內容與附件皆為唯讀。
          </div>
        ) : null}

        {isDraft ? (
          <div className="mt-4">
            <div className="text-sm font-medium">草稿內容</div>
            <div className="mt-3">
              <DraftEditorForm
                documentId={doc.id}
                initialTitle={doc.title}
                initialContent={currentVersion.content}
                onSaved={() => detailQuery.refetch()}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-sm text-slate-600">內容與歷史版本請在下方「版本」分頁查看。</div>
          </div>
        )}
      </div>

      <DocumentTabs
        title={doc.title}
        status={doc.status}
        currentVersion={{ versionNo: currentVersion.versionNo, content: currentVersion.content }}
        attachments={attachments}
        reviewTasks={tasks}
        approvalRecords={approvalRecords}
        auditLogs={auditLogs}
        versionPanel={
          isDraft ? (
            <div className="text-sm text-slate-600">草稿編輯請在上方卡片進行。</div>
          ) : (
            <div>
              <div className="text-sm font-medium">內容</div>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-900">
                {currentVersion.content}
              </pre>
            </div>
          )
        }
        attachmentsPanel={attachmentsPanel}
        tasksPanel={tasksPanel}
        recordsPanel={recordsPanel}
      />
    </div>
  );
}
