'use client';

import { TaxonomyManager } from '../../../../src/ui/components/admin/taxonomy/TaxonomyManager';

export default function AdminTagsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">標籤管理</h1>
      <div className="mt-4">
        <TaxonomyManager kindLabel="標籤" listEndpoint="/api/admin/taxonomy/tags" upsertEndpoint="/api/admin/taxonomy/tags" responseKey="tags" />
      </div>
    </div>
  );
}
