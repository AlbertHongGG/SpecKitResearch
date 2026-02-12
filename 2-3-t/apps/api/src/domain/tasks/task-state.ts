import { HttpError } from '../../http/errors';

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';

const ALLOWED: Record<TaskStatus, ReadonlySet<TaskStatus>> = {
  open: new Set(['in_progress', 'blocked', 'done', 'archived']),
  in_progress: new Set(['blocked', 'done', 'archived']),
  blocked: new Set(['in_progress', 'done', 'archived']),
  done: new Set(['archived']),
  archived: new Set([]),
};

export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].has(to);
}

export function assertValidTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (isValidTaskTransition(from, to)) return;

  throw new HttpError(422, 'INVALID_TRANSITION', `Invalid task status transition: ${from} -> ${to}`, {
    from,
    to,
  });
}
