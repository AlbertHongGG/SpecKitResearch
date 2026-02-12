'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Invitation } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { useToast } from '../../components/Toast';

export function InvitationsPanel({ invitations }: { invitations: Invitation[] }) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const accept = useMutation({
        mutationFn: (id: string) => api.acceptInvitation(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['myProjects'] });
            toast.push('已接受邀請', 'success');
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '接受邀請失敗', 'error'),
    });

    const reject = useMutation({
        mutationFn: (id: string) => api.rejectInvitation(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['myProjects'] });
            toast.push('已拒絕邀請', 'info');
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '拒絕邀請失敗', 'error'),
    });

    if (!invitations.length) {
        return <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有邀請。</div>;
    }

    return (
        <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium">待處理邀請</div>
            <div className="mt-3 space-y-2">
                {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                        <div>
                            <div className="text-sm font-medium text-slate-900">專案：{inv.projectId}</div>
                            <div className="text-xs text-slate-500">角色：{inv.invitedRole}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                                disabled={accept.isPending || reject.isPending}
                                onClick={() => accept.mutate(inv.id)}
                            >
                                接受
                            </button>
                            <button
                                type="button"
                                className="rounded border px-3 py-1.5 text-sm disabled:opacity-60"
                                disabled={accept.isPending || reject.isPending}
                                onClick={() => reject.mutate(inv.id)}
                            >
                                拒絕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
