'use client';

import { useQuery } from '@tanstack/react-query';

import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { adminClient } from '@/services/adminClient';

export default function AdminTaxonomyPage() {
  const categoriesQ = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminClient.listCategories });
  const tagsQ = useQuery({ queryKey: ['admin', 'tags'], queryFn: adminClient.listTags });

  if (categoriesQ.isLoading || tagsQ.isLoading) return <Loading />;
  if (categoriesQ.isError) return <InlineError message={(categoriesQ.error as any)?.message ?? '載入失敗'} />;
  if (tagsQ.isError) return <InlineError message={(tagsQ.error as any)?.message ?? '載入失敗'} />;
  if (!categoriesQ.data || !tagsQ.data) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">分類 / 標籤</h1>
      <div className="mt-6">
        <TaxonomyManager categories={categoriesQ.data.categories} tags={tagsQ.data.tags} />
      </div>
    </div>
  );
}
