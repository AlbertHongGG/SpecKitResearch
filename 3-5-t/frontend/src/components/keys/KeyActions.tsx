'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EditKeyForm } from './EditKeyForm';

export function KeyActions({
  keyItem,
  onRotated,
}: {
  keyItem: any;
  onRotated: (plainKey: string) => void;
}) {
  const qc = useQueryClient();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex gap-2">
      <button className="rounded border px-3 py-1 text-sm" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button className="rounded border px-3 py-1 text-sm" onClick={() => setConfirmRevoke(true)}>
        Revoke
      </button>
      <Button type="button" className="px-3 py-1 text-sm" onClick={() => setConfirmRotate(true)}>
        Rotate
      </Button>

      {editing ? (
        <Modal title="Edit key" onClose={() => setEditing(false)}>
          <EditKeyForm keyItem={keyItem} onDone={() => setEditing(false)} />
        </Modal>
      ) : null}

      {confirmRevoke ? (
        <Modal title="Confirm revoke" onClose={() => setConfirmRevoke(false)}>
          <p className="text-sm text-gray-700">撤銷後此 key 會立即失效。</p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={async () => {
                await apiFetch(`/keys/${keyItem.id}/revoke`, { method: 'POST' });
                await qc.invalidateQueries({ queryKey: ['keys'] });
                setConfirmRevoke(false);
              }}
            >
              Revoke
            </Button>
            <button className="rounded border px-4 py-2" onClick={() => setConfirmRevoke(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}

      {confirmRotate ? (
        <Modal title="Confirm rotate" onClose={() => setConfirmRotate(false)}>
          <p className="text-sm text-gray-700">Rotation 會建立新 key 並撤銷舊 key。新 key 原文只會顯示一次。</p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              onClick={async () => {
                const res = await apiFetch<{ plainKey: string }>(`/keys/${keyItem.id}/rotate`, { method: 'POST' });
                await qc.invalidateQueries({ queryKey: ['keys'] });
                onRotated(res.plainKey);
                setConfirmRotate(false);
              }}
            >
              Rotate
            </Button>
            <button className="rounded border px-4 py-2" onClick={() => setConfirmRotate(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
