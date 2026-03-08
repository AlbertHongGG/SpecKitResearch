'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function ShowOnceKeyDialog({ plainKey, onClose }: { plainKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="你的 API Key（只顯示一次）" onClose={onClose}>
      <p className="text-sm text-gray-600">請立刻複製並妥善保存。之後將無法再次查看。</p>
      <pre className="mt-3 overflow-auto rounded bg-gray-50 p-3 text-xs">{plainKey}</pre>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(plainKey);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </Modal>
  );
}
