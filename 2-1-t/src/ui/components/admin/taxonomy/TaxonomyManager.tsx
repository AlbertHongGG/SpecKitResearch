'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../lib/apiClient';
import { ErrorState, LoadingState, EmptyState } from '../../States';
import { TaxonomyTable, type TaxonomyItem } from './TaxonomyTable';
import { useToast } from '../../Toast';

export function TaxonomyManager(params: {
  kindLabel: string;
  listEndpoint: string;
  upsertEndpoint: string;
  responseKey: 'categories' | 'tags';
}) {
  const toast = useToast();
  const q = useQuery({
    queryKey: ['admin-taxonomy', params.responseKey],
    queryFn: () => apiFetch<Record<string, TaxonomyItem[]>>(params.listEndpoint),
  });

  async function upsert(payload: { id?: string; name: string; isActive?: boolean }) {
    try {
      await apiFetch(params.upsertEndpoint, { method: 'POST', body: JSON.stringify(payload) });
      toast.success(`已更新${params.kindLabel}`);
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `更新${params.kindLabel}失敗`);
      throw e;
    }
  }

  if (q.isLoading) return <LoadingState />;
  if (q.isError)
    return <ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} />;

  const items = (q.data?.[params.responseKey] ?? []) as TaxonomyItem[];
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState title={`尚無${params.kindLabel}`} description="可先新增一筆" />
        <TaxonomyTable items={items} kindLabel={params.kindLabel} onUpsert={upsert} />
      </div>
    );
  }

  return <TaxonomyTable items={items} kindLabel={params.kindLabel} onUpsert={upsert} />;
}
