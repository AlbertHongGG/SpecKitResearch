'use client';

import { useState, type ReactNode } from 'react';
import ArchiveControls from './ArchiveControls';
import WipSettings from './WipSettings';

export default function ListColumn({
  list,
  readonly,
  canChangeWip,
  onRename,
  onChangeWip,
  onArchive,
  children,
}: {
  list: {
    id: string;
    title: string;
    isWipLimited: boolean;
    wipLimit: number | null;
  };
  readonly: boolean;
  canChangeWip: boolean;
  onRename: (title: string) => void | Promise<void>;
  onChangeWip: (patch: { isWipLimited: boolean; wipLimit: number | null }) => void | Promise<void>;
  onArchive: () => void | Promise<void>;
  children?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3" data-testid={`list-${list.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={title}
                disabled={readonly}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                disabled={readonly || title.trim().length === 0}
                onClick={async () => {
                  await onRename(title.trim());
                  setEditing(false);
                }}
              >
                儲存
              </button>
              <button
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                onClick={() => {
                  setTitle(list.title);
                  setEditing(false);
                }}
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-900">{list.title}</h3>
              <button
                className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-700 disabled:opacity-50"
                disabled={readonly}
                onClick={() => setEditing(true)}
                data-testid={`rename-${list.id}`}
              >
                改名
              </button>
            </div>
          )}
        </div>

        <ArchiveControls kind="list" disabled={readonly} onArchive={onArchive} />
      </div>

      {canChangeWip ? (
        <WipSettings
          isWipLimited={list.isWipLimited}
          wipLimit={list.wipLimit}
          disabled={readonly}
          onChange={onChangeWip}
        />
      ) : (
        <div className="mt-2 text-xs text-slate-600">WIP 設定僅 Owner/Admin 可修改。</div>
      )}

      <div className="mt-3">{children}</div>
    </section>
  );
}
