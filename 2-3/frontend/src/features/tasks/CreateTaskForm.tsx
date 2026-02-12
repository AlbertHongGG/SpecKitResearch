'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api, type Task } from '../../lib/api/client';
import { useToast } from '../../components/Toast';

const schema = z.object({
    title: z.string().min(1, '請輸入標題').max(200),
    description: z.string().max(20000).optional(),
});

type FormValues = z.infer<typeof schema>;

function randomIdempotencyKey(): string {
    // Not cryptographic; sufficient for client-side idempotency on retries.
    return `idem_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function CreateTaskForm(props: {
    projectId: string;
    listId: string;
    disabled?: boolean;
    onCreated?: (task: Task) => void;
}) {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToast();
    const idemKey = useMemo(() => randomIdempotencyKey(), []);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { title: '', description: '' },
    });

    const createMutation = useMutation({
        mutationFn: async (values: FormValues) => {
            return api.createTask(props.listId, {
                idempotencyKey: idemKey,
                title: values.title,
                description: values.description || undefined,
            });
        },
        onSuccess: async (task) => {
            toast.push('已建立任務', 'success');
            setOpen(false);
            form.reset({ title: '', description: '' });
            props.onCreated?.(task);
            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
        },
        onError: (err: unknown) => {
            const message = err instanceof Error && err.message ? err.message : '建立任務失敗';
            toast.push(message, 'error');
        },
    });

    if (!open) {
        return (
            <button
                type="button"
                className="w-full rounded border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setOpen(true)}
                disabled={props.disabled}
            >
                + 新增任務
            </button>
        );
    }

    return (
        <form
            className="rounded border bg-white p-3"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
            <div className="space-y-2">
                <div>
                    <input
                        className="w-full rounded border px-2 py-1 text-sm"
                        placeholder="任務標題"
                        autoFocus
                        {...form.register('title')}
                        disabled={createMutation.isPending}
                    />
                    {form.formState.errors.title ? (
                        <div className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</div>
                    ) : null}
                </div>

                <div>
                    <textarea
                        className="w-full rounded border px-2 py-1 text-sm"
                        placeholder="描述（可選）"
                        rows={3}
                        {...form.register('description')}
                        disabled={createMutation.isPending}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                        disabled={createMutation.isPending}
                    >
                        建立
                    </button>
                    <button
                        type="button"
                        className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
                        onClick={() => {
                            setOpen(false);
                            form.reset({ title: '', description: '' });
                        }}
                        disabled={createMutation.isPending}
                    >
                        取消
                    </button>
                </div>
            </div>
        </form>
    );
}
