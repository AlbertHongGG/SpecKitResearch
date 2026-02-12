'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { List } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { useToast } from '../../components/Toast';

export function WipSettingsPanel(props: {
    projectId: string;
    list: List;
    canManage: boolean;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const [isWipLimited, setIsWipLimited] = useState(props.list.isWipLimited);
    const [wipLimit, setWipLimit] = useState<number>(props.list.wipLimit ?? 0);

    const mutation = useMutation({
        mutationFn: async () => {
            return api.updateListWip(props.list.id, {
                isWipLimited,
                wipLimit: isWipLimited ? wipLimit : 0,
            });
        },
        onSuccess: async () => {
            toast.push('已更新 WIP 設定', 'success');
            setOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '更新 WIP 失敗', 'error'),
    });

    if (!props.canManage) return null;

    return (
        <div className="relative">
            <button
                type="button"
                className="rounded border px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => {
                    setIsWipLimited(props.list.isWipLimited);
                    setWipLimit(props.list.wipLimit ?? 0);
                    setOpen((v) => !v);
                }}
            >
                WIP
            </button>

            {open ? (
                <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border bg-white p-3 shadow">
                    <div className="text-xs font-medium text-slate-700">WIP 設定</div>

                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                        <input
                            type="checkbox"
                            checked={isWipLimited}
                            onChange={(e) => setIsWipLimited(e.target.checked)}
                            disabled={mutation.isPending}
                        />
                        啟用 WIP 限制
                    </label>

                    <div className="mt-2">
                        <label className="text-xs text-slate-600">上限</label>
                        <input
                            type="number"
                            min={0}
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            value={wipLimit}
                            onChange={(e) => setWipLimit(parseInt(e.target.value || '0', 10))}
                            disabled={mutation.isPending || !isWipLimited}
                        />
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            className="rounded border px-2 py-1 text-xs"
                            disabled={mutation.isPending}
                            onClick={() => setOpen(false)}
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate()}
                        >
                            儲存
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
