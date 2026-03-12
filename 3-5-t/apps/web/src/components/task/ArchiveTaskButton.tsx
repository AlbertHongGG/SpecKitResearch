'use client';

export default function ArchiveTaskButton({
  disabled,
  onArchive,
}: {
  disabled: boolean;
  onArchive: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 disabled:opacity-50"
      disabled={disabled}
      onClick={() => void onArchive()}
      data-testid="task-archive"
    >
      封存 task
    </button>
  );
}
