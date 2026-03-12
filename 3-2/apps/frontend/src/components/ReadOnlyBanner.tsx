'use client';

import type { ApiError } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';

export type ReadOnlyReason = 'ORG_SUSPENDED' | 'PROJECT_ARCHIVED';

export function isReadOnlyReason(reason: unknown): reason is ReadOnlyReason {
  return reason === 'ORG_SUSPENDED' || reason === 'PROJECT_ARCHIVED';
}

export function readOnlyReasonFromOrgStatus(status: 'active' | 'suspended' | null | undefined): ReadOnlyReason | null {
  if (status === 'suspended') return 'ORG_SUSPENDED';
  return null;
}

export function readOnlyReasonFromProjectStatus(
  status: 'active' | 'archived' | null | undefined,
): ReadOnlyReason | null {
  if (status === 'archived') return 'PROJECT_ARCHIVED';
  return null;
}

export function readOnlyReasonFromApiError(err: unknown): ReadOnlyReason | null {
  if (!isApiError(err)) return null;
  return isReadOnlyReason(err.code) ? err.code : null;
}

export function isReadOnlyApiError(err: unknown): err is ApiError & { code: ReadOnlyReason } {
  return isApiError(err) && isReadOnlyReason(err.code);
}

export function ReadOnlyBanner({ reason }: { reason: ReadOnlyReason | null | undefined }) {
  if (!reason) return null;

  const title =
    reason === 'ORG_SUSPENDED' ? '組織已停權（唯讀）' : reason === 'PROJECT_ARCHIVED' ? '專案已封存（唯讀）' : '唯讀';

  const description =
    reason === 'ORG_SUSPENDED'
      ? '此組織目前為 suspended 狀態：所有寫入操作（邀請、建立專案、編輯 Issue 等）都會被拒絕。'
      : '此專案目前為 archived 狀態：所有寫入操作（編輯、轉狀態、留言等）都會被拒絕，且封存不可逆。';

  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-700">{description}</div>
      <div className="mt-2 text-xs text-slate-600">Error code: {reason}</div>
    </div>
  );
}
