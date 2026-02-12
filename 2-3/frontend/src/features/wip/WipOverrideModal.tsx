'use client';

import { useState } from 'react';

import { Modal } from '../../components/Modal';

export function WipOverrideModal(props: {
    open: boolean;
    listTitle: string;
    limit: number;
    count: number;
    onCancel: () => void;
    onSubmit: (reason: string) => void;
}) {
    const [reason, setReason] = useState('');

    const handleCancel = () => {
        setReason('');
        props.onCancel();
    };

    const handleSubmit = () => {
        const trimmed = reason.trim();
        if (!trimmed) return;
        setReason('');
        props.onSubmit(trimmed);
    };

    if (!props.open) return null;

    return (
        <Modal open={props.open} title="WIP 超限覆寫" onClose={handleCancel} variant="modal" maxWidthClassName="max-w-lg">
            <div className="p-4">
                <div className="text-xs text-slate-600">
                    目標欄位「{props.listTitle}」已達 WIP 上限（{props.count}/{props.limit}）。
                </div>

                <div className="mt-3">
                    <label className="text-xs font-medium text-slate-600">覆寫理由（必填）</label>
                    <textarea
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="例如：緊急修復，需要先進行中"
                        autoFocus
                    />
                </div>

                <div className="mt-3 flex justify-end gap-2">
                    <button type="button" className="rounded border px-3 py-2 text-sm" onClick={handleCancel}>
                        取消
                    </button>
                    <button
                        type="button"
                        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={!reason.trim()}
                        onClick={handleSubmit}
                    >
                        仍要移動
                    </button>
                </div>
            </div>
        </Modal>
    );
}
