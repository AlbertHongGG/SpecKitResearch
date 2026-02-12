'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import type { Task } from '../../lib/api/client';
import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/http';
import { zodForm } from '../../lib/forms/zodForm';
import { useToast } from '../../components/Toast';
import { ConflictBanner } from './conflicts/ConflictBanner';

const schema = z.object({
    title: z.string().min(1, '請輸入標題'),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.coerce.number().int().optional(),
    assigneeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

export function TaskEditor(props: {
    projectId: string;
    task: Task;
    onUpdated: (task: Task) => void;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [conflict, setConflict] = useState<{ taskId: string; message: string } | null>(null);

    const form = useForm<FormValues>(
        zodForm<FormValues>(schema, {
            defaultValues: {
                title: props.task.title,
                description: props.task.description ?? '',
                dueDate: props.task.dueDate ?? '',
                priority: props.task.priority ?? undefined,
                assigneeIds: props.task.assigneeIds ?? [],
            },
        }),
    );

    const assigneeIds = useWatch({ control: form.control, name: 'assigneeIds' }) ?? [];

    useEffect(() => {
        form.reset({
            title: props.task.title,
            description: props.task.description ?? '',
            dueDate: props.task.dueDate ?? '',
            priority: props.task.priority ?? undefined,
            assigneeIds: props.task.assigneeIds ?? [],
        });
    }, [props.task, form]);

    const membersQuery = useQuery({
        queryKey: ['projectMembers', props.projectId],
        queryFn: () => api.projectMembers(props.projectId),
    });

    const mutation = useMutation({
        mutationFn: async (values: FormValues) =>
            api.updateTask(props.task.id, {
                expectedVersion: props.task.version,
                title: values.title,
                description: values.description?.trim() ? values.description.trim() : '',
                dueDate: values.dueDate?.trim() ? values.dueDate.trim() : '',
                priority: values.priority,
                assigneeIds: values.assigneeIds ?? [],
            }),
        onSuccess: async (task) => {
            setConflict(null);
            props.onUpdated(task);
            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
            toast.push('已儲存任務', 'success');
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 409) {
                setConflict({ taskId: props.task.id, message: '版本衝突：請重新載入最新版本' });
                return;
            }
            toast.push(err instanceof Error ? err.message : '儲存失敗', 'error');
        },
    });

    const reloadLatest = async () => {
        try {
            const latest = await api.getTask(props.task.id);
            setConflict(null);
            props.onUpdated(latest);
            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
        } catch (e) {
            toast.push(e instanceof Error ? e.message : '重新載入失敗', 'error');
        }
    };

    const conflictMessage = conflict?.taskId === props.task.id ? conflict.message : null;

    return (
        <div className="space-y-3">
            {conflictMessage ? <ConflictBanner message={conflictMessage} onReload={reloadLatest} /> : null}

            <form className="space-y-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
                <div>
                    <label className="text-xs font-medium text-slate-600">標題</label>
                    <input className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('title')} />
                    {form.formState.errors.title?.message ? (
                        <div className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</div>
                    ) : null}
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-600">描述</label>
                    <textarea rows={4} className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('description')} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-slate-600">Due（YYYY-MM-DD）</label>
                        <input className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('dueDate')} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600">Priority</label>
                        <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('priority')} />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-600">指派（以 userId 顯示）</label>
                    <div className="mt-2 space-y-1 rounded border p-2">
                        {membersQuery.isLoading ? (
                            <div className="text-xs text-slate-600">載入成員中…</div>
                        ) : membersQuery.data?.members?.length ? (
                            membersQuery.data.members.map((m) => {
                                const selected = assigneeIds.includes(m.userId);
                                return (
                                    <label key={m.userId} className="flex items-center gap-2 text-xs text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => {
                                                const current = form.getValues('assigneeIds') ?? [];
                                                const next = current.includes(m.userId)
                                                    ? current.filter((x) => x !== m.userId)
                                                    : [...current, m.userId];
                                                form.setValue('assigneeIds', next, { shouldDirty: true });
                                            }}
                                        />
                                        <span className="font-mono">{m.userId}</span>
                                        <span className="text-[10px] text-slate-500">({m.role})</span>
                                    </label>
                                );
                            })
                        ) : (
                            <div className="text-xs text-slate-600">沒有可指派的成員</div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? '儲存中…' : '儲存'}
                    </button>
                </div>
            </form>
        </div>
    );
}
