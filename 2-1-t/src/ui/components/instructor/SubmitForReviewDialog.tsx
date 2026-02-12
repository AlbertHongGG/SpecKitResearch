'use client';

import { Button } from '../Button';

export function SubmitForReviewDialog(params: { disabled?: boolean; onConfirm: () => Promise<void> }) {
  return (
    <Button
      type="button"
      disabled={params.disabled}
      onClick={async () => {
        const ok = window.confirm('確認提交審核？提交後在審核完成前可能無法編輯。');
        if (!ok) return;
        await params.onConfirm();
        window.location.reload();
      }}
    >
      提交審核
    </Button>
  );
}
