import { ERROR_CODES } from '@trello-lite/shared';
import { HttpError } from '../../http/errors';

export type WipPolicy = {
  isWipLimited: boolean;
  wipLimit: number | null;
};

export type WipOverride = {
  enabled: boolean;
  reason?: string | null;
} | null;

export function assertWipAllowsAdd(policy: WipPolicy, currentActiveCount: number, override: WipOverride = null): void {
  if (!policy.isWipLimited) return;
  if (policy.wipLimit == null) return;
  if (currentActiveCount < policy.wipLimit) return;

  if (override?.enabled) {
    return;
  }

  throw new HttpError(409, ERROR_CODES.WIP_LIMIT_EXCEEDED, 'WIP limit exceeded', {
    wipLimit: policy.wipLimit,
    currentActiveCount,
  });
}
