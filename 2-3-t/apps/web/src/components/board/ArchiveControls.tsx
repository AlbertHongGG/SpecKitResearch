'use client';

export default function ArchiveControls({
  kind,
  disabled,
  onArchive,
}: {
  kind: 'board' | 'list';
  disabled: boolean;
  onArchive: () => void | Promise<void>;
}) {
  return (
    <button
      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      disabled={disabled}
      onClick={async () => {
        const label = kind === 'board' ? 'board' : 'list';
        if (!confirm(`確定要封存這個 ${label}？`)) return;
        await onArchive();
      }}
      data-testid={kind === 'board' ? 'archive-board' : 'archive-list'}
    >
      封存
    </button>
  );
}
