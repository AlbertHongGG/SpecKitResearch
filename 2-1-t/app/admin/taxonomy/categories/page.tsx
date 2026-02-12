'use client';

import { TaxonomyManager } from '../../../../src/ui/components/admin/taxonomy/TaxonomyManager';

export default function AdminCategoriesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">分類管理</h1>
      <div className="mt-4">
        <TaxonomyManager
          kindLabel="分類"
          listEndpoint="/api/admin/taxonomy/categories"
          upsertEndpoint="/api/admin/taxonomy/categories"
          responseKey="categories"
        />
      </div>
    </div>
  );
}
