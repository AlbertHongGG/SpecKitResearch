import { useNavigate } from 'react-router-dom';

import { ErrorState, LoadingState, EmptyState } from '../ui/states';
import { useCreateDocument, useDocumentsList } from '../services/documents';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';
import { StatusBadge } from '../components/StatusBadge';
import { SafeText } from '../components/SafeText';

export function DocumentsListPage() {
  const nav = useNavigate();
  const docs = useDocumentsList();
  const create = useCreateDocument();
  const toast = useToast();

  if (docs.isLoading) return <LoadingState />;
  if (docs.isError) return <ErrorState>無法載入文件清單。</ErrorState>;

  const items = docs.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">文件</h1>
        <AsyncButton
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          isLoading={create.isPending}
          loadingText="建立中…"
          onClick={async () => {
            try {
              const created = await create.mutateAsync({ title: 'Untitled', content: '' });
              nav(`/documents/${created.id}`);
            } catch {
              toast.error('建立失敗');
            }
          }}
          type="button"
        >
          新增文件
        </AsyncButton>
      </div>

      {items.length === 0 ? (
        <EmptyState title="尚無文件">點右上角新增第一份文件。</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-200">
            {items.map((d) => (
              <li key={d.id}>
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => nav(`/documents/${d.id}`)}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      <SafeText value={d.title} />
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">更新：{new Date(d.updatedAt).toLocaleString()}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
