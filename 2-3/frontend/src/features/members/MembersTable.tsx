'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Membership } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { useToast } from '../../components/Toast';
import { formatDateTime } from '../../lib/dates';

export function MembersTable(props: {
    projectId: string;
    members: Membership[];
    canManage: boolean;
    isOwner: boolean;
    myUserId: string | null;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const updateRole = useMutation({
        mutationFn: (p: { userId: string; role: Membership['role'] }) => api.updateMemberRole(props.projectId, p),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['projectMembers', props.projectId] });
            toast.push('已更新角色', 'success');
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '更新角色失敗', 'error'),
    });

    const remove = useMutation({
        mutationFn: (userId: string) => api.removeMember(props.projectId, userId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['projectMembers', props.projectId] });
            toast.push('已移除成員', 'info');
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '移除成員失敗', 'error'),
    });

    return (
        <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">成員</div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600">
                        <tr>
                            <th className="px-4 py-2">userId</th>
                            <th className="px-4 py-2">role</th>
                            <th className="px-4 py-2">joinedAt</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.members.map((m) => {
                            const isSelf = props.myUserId ? m.userId === props.myUserId : false;
                            const canEditRow = props.canManage && (!isSelf || props.isOwner);
                            const canRemove = props.isOwner && !isSelf && m.role !== 'owner';

                            return (
                                <tr key={m.userId} className="border-t">
                                    <td className="px-4 py-2 font-mono text-xs text-slate-700">{m.userId}</td>
                                    <td className="px-4 py-2">
                                        {canEditRow ? (
                                            <select
                                                className="rounded border px-2 py-1 text-sm"
                                                value={m.role}
                                                disabled={updateRole.isPending}
                                                onChange={(e) => updateRole.mutate({ userId: m.userId, role: e.target.value as Membership['role'] })}
                                            >
                                                <option value="owner">owner</option>
                                                <option value="admin">admin</option>
                                                <option value="member">member</option>
                                                <option value="viewer">viewer</option>
                                            </select>
                                        ) : (
                                            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{m.role}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-600">{formatDateTime(m.joinedAt)}</td>
                                    <td className="px-4 py-2 text-right">
                                        {canRemove ? (
                                            <button
                                                type="button"
                                                className="rounded border px-2 py-1 text-xs text-slate-700 disabled:opacity-60"
                                                disabled={remove.isPending}
                                                onClick={() => remove.mutate(m.userId)}
                                            >
                                                移除
                                            </button>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
