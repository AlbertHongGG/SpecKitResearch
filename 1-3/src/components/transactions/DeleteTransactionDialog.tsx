'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function DeleteTransactionDialog({
  open,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title="刪除帳務" onClose={onClose}>
      <div className="grid gap-3">
        <p className="text-sm text-neutral-700">確定要刪除這筆帳務嗎？此操作無法復原。</p>
        <div className="flex gap-2">
          <Button type="button" variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? '刪除中…' : '確定刪除'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
}
