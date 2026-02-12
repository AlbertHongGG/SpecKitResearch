import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/status/ErrorState';
import { EmptyState } from '../components/status/EmptyState';
import { DocumentStatusBadge } from '../components/documents/DocumentStatusBadge';

export function DocumentsListPage() {
  const navigate = useNavigate();

  const listQuery = useQuery({
    queryKey: ['documents', 'list'],
    queryFn: () => documentsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => documentsApi.createDraft({ title: '未命名文件' }),
    onSuccess: async (res) => {
      await listQuery.refetch();
      navigate(`/documents/${res.documentId}`);
    },
  });

  if (listQuery.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (listQuery.error) {
    return <ErrorState title="載入文件失敗" error={listQuery.error} />;
  }

  const documents = listQuery.data?.documents ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">文件</h1>
        <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
          新增 Draft
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState title="尚無文件" description="先建立一份 Draft 開始編輯。" />
      ) : (
        <div className="mt-4 divide-y rounded-lg border border-slate-200 bg-white">
          {documents.map((d) => (
            <div key={d.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{d.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <DocumentStatusBadge status={d.status} />
                  <span>{new Date(d.updatedAt).toLocaleString()}</span>
                </div>
              </div>
              <Link className="text-sm text-slate-900 underline" to={`/documents/${d.id}`}>
                開啟
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
