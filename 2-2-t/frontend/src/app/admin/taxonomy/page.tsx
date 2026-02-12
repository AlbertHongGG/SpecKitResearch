import { cookies } from 'next/headers';
import { getTaxonomyAdmin } from '../../../services/admin';
import { TaxonomyEditor } from './taxonomy-editor';

export const dynamic = 'force-dynamic';

export default async function AdminTaxonomyPage() {
  const cookie = (await cookies()).toString();
  const data = await getTaxonomyAdmin({ cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">分類 / 標籤</h1>
      </div>
      <TaxonomyEditor initialCategories={data.categories} initialTags={data.tags} />
    </div>
  );
}
