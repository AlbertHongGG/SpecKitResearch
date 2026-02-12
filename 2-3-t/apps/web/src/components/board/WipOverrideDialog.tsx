'use client';

import { useState } from 'react';

export default function WipOverrideDialog({
  open,
  wipLimit,
  currentActiveCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  wipLimit: number | null;
  currentActiveCount: number | null;
  onClose: () => void;
  onConfirm: (input: { reason: string | null }) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-xl">
        <div className="text-sm font-semibold text-slate-900">WIP 超限</div>
        <div className="mt-2 text-sm text-slate-700">
          目標 list 已達 WIP 上限{wipLimit != null ? `（${currentActiveCount ?? '—'}/${wipLimit}）` : ''}。
          你可以選擇取消，或以 override 繼續（需填寫原因）。
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700">Override 原因（可選）</label>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            placeholder="例如：緊急修復、請求例外…"
            data-testid="wip-override-reason"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
            onClick={onClose}
            data-testid="wip-override-cancel"
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
            onClick={() => onConfirm({ reason: reason.trim().length ? reason.trim() : null })}
            data-testid="wip-override-confirm"
          >
            繼續（Override）
          </button>
        </div>
      </div>
    </div>
  );
}
