'use client';

import { Button } from '../../Button';
import { NameForm } from './NameForm';

export type TaxonomyItem = { id: string; name: string; isActive: boolean };

export function TaxonomyTable(params: {
  items: TaxonomyItem[];
  kindLabel: string;
  onUpsert: (payload: { id?: string; name: string; isActive?: boolean }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">新增{params.kindLabel}</div>
        <div className="mt-2">
          <NameForm submitLabel="新增" onSubmit={(name) => params.onUpsert({ name })} />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">名稱</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {params.items.map((it) => (
              <tr key={it.id} className="border-t border-slate-200">
                <td className="px-3 py-2">
                  <NameForm
                    initialName={it.name}
                    submitLabel="儲存"
                    onSubmit={(name) => params.onUpsert({ id: it.id, name })}
                  />
                </td>
                <td className="px-3 py-2">
                  <span className={it.isActive ? 'text-green-700' : 'text-slate-500'}>
                    {it.isActive ? '啟用' : '停用'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void params.onUpsert({ id: it.id, name: it.name, isActive: !it.isActive })}
                  >
                    {it.isActive ? '停用' : '啟用'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
