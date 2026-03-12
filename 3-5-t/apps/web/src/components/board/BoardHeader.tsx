import type { ProjectRole } from '../../lib/use-membership';

export default function BoardHeader({
  projectName,
  role,
  boards,
  selectedBoardId,
  onSelectBoard,
}: {
  projectName: string;
  role: ProjectRole | null;
  boards: Array<{ id: string; name: string }>;
  selectedBoardId: string | null;
  onSelectBoard: (id: string) => void;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-sm text-slate-600">Project</div>
        <div className="text-xl font-semibold text-slate-900">{projectName}</div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="text-sm text-slate-600">你的角色：{role ?? '—'}</div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Board</span>
          <select
            className="min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedBoardId ?? ''}
            onChange={(e) => onSelectBoard(e.target.value)}
            data-testid="board-select"
          >
            {boards.length === 0 ? <option value="">(no boards)</option> : null}
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
