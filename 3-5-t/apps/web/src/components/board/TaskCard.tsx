'use client';

import type { ButtonHTMLAttributes } from 'react';

function cn(...parts: Array<string | null | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';

export type TaskCardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  version: number;
};

export default function TaskCard({
  task,
  dragging,
  onClick,
  className,
  ...buttonProps
}: {
  task: TaskCardTask;
  dragging?: boolean;
  onClick?: () => void;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const statusLabel: Record<TaskStatus, string> = {
    open: 'Open',
    in_progress: 'In progress',
    blocked: 'Blocked',
    done: 'Done',
    archived: 'Archived',
  };

  const statusTone: Record<TaskStatus, string> = {
    open: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-800',
    blocked: 'bg-amber-100 text-amber-900',
    done: 'bg-emerald-100 text-emerald-900',
    archived: 'bg-slate-100 text-slate-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-sm',
        'hover:border-slate-300 hover:bg-slate-50',
        'focus:outline-none focus:ring-2 focus:ring-slate-400',
        dragging ? 'opacity-60' : null,
        className
      )}
      data-testid={`task-${task.id}`}
      {...buttonProps}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-medium text-slate-900">{task.title}</div>
        </div>
        <span
          className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', statusTone[task.status])}
        >
          {statusLabel[task.status]}
        </span>
      </div>
    </button>
  );
}
