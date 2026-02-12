import { ERROR_CODES } from '@trello-lite/shared';
import { HttpError } from '../../http/errors';
import { assertWritableScope, type ArchivedScope } from '../archived/archived';
import { assertWipAllowsAdd, type WipOverride } from '../wip/wip';
import { assertValidTaskTransition, type TaskStatus } from './task-state';

export function assertTaskWritable(scope: ArchivedScope): void {
  assertWritableScope(scope);
}

export function assertTaskStatusChange(from: TaskStatus, to: TaskStatus): void {
  assertValidTaskTransition(from, to);
}

export function assertWipAllowsMoveOrCreate(
  policy: { isWipLimited: boolean; wipLimit: number | null },
  currentActiveCount: number,
  override: WipOverride | undefined
): void {
  assertWipAllowsAdd(policy, currentActiveCount, override);
}

export function assertWipOverrideAllowed(role: 'owner' | 'admin' | 'member' | 'viewer', override?: WipOverride | null) {
  if (!override?.enabled) return;

  if (role !== 'owner' && role !== 'admin') {
    throw new HttpError(403, ERROR_CODES.FORBIDDEN, 'Forbidden');
  }
}
