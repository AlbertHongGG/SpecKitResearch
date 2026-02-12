import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError } from '../services/apiClient';
import { useMe } from '../services/auth';
import { useDocumentDetail } from '../services/documents';
import { ErrorState, ForbiddenState, LoadingState, NotFoundState } from '../ui/states';
import { StatusBadge, canEditDraftForRole } from '../components/StatusBadge';
import { DocumentDraftEditor } from '../components/DocumentDraftEditor';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { SubmitForApprovalDialog } from '../components/SubmitForApprovalDialog';
import { DocumentTimelinePanels } from '../components/DocumentTimelinePanels';
import { ReviewerActionPanel } from '../components/ReviewerActionPanel';
import { AdminArchiveButton } from '../components/AdminArchiveButton';
import { SafeText } from '../components/SafeText';

export function DocumentDetailPage() {
  const params = useParams();
  const id = params.id ?? '';

  const me = useMe();
  const detail = useDocumentDetail(id);

  const apiError = useMemo(() => {
    if (!detail.isError) return undefined;
    const e = detail.error as unknown;
    return e instanceof ApiError ? e : undefined;
  }, [detail.isError, detail.error]);

  if (detail.isLoading) return <LoadingState />;

  if (detail.isError) {
    if (apiError?.status === 404) return <NotFoundState />;
    if (apiError?.status === 403) return <ForbiddenState />;
    return <ErrorState>無法載入文件。</ErrorState>;
  }

  if (!detail.data) return <ErrorState>無法載入文件。</ErrorState>;

  const data = detail.data;
  const role = me.data?.role;
  const canEditDraft = canEditDraftForRole(data.document.status, role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            <SafeText value={data.document.title} />
          </h1>
          <div className="mt-1 text-xs text-slate-600">Owner：{data.document.owner.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {me.data?.role === 'Admin' ? <AdminArchiveButton document={data} /> : null}
          <StatusBadge status={data.document.status} />
        </div>
      </div>

      {canEditDraft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold">編輯 Draft</div>
            <DocumentDraftEditor document={data} />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold">附件</div>
              <AttachmentUploader document={data} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold">送審</div>
              <SubmitForApprovalDialog document={data} />
            </div>
          </div>
        </div>
      ) : null}

      {me.data?.role === 'Reviewer' ? <ReviewerActionPanel document={data} /> : null}

      <div className="rounded-lg border border-slate-200 bg-white">
        <DocumentTimelinePanels document={data} />
      </div>
    </div>
  );
}
