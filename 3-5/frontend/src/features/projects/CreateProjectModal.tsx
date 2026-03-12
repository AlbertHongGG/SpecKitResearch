'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/http';
import { zodForm } from '../../lib/forms/zodForm';
import { useToast } from '../../components/Toast';

const schema = z.object({
    name: z.string().min(1, '請輸入專案名稱'),
    description: z.string().optional(),
    visibility: z.enum(['private', 'shared']).default('private'),
});

type FormValues = z.infer<typeof schema>;

export function CreateProjectModal({ triggerLabel = '建立專案' }: { triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const toast = useToast();
    const queryClient = useQueryClient();

    const form = useForm<FormValues>(
        zodForm<FormValues>(schema, {
            defaultValues: {
                name: '',
                description: '',
                visibility: 'private',
            },
        }),
    );

    const mutation = useMutation({
        mutationFn: async (values: FormValues) =>
            api.createProject({
                name: values.name,
                description: values.description?.trim() ? values.description.trim() : undefined,
                visibility: values.visibility,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['myProjects'] });
            toast.push('已建立專案', 'success');
            setOpen(false);
            form.reset();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                for (const [key, msgs] of Object.entries(err.fieldErrors)) {
                    const message = msgs?.[0];
                    if (!message) continue;
                    if (key === 'name' || key === 'description' || key === 'visibility') {
                        form.setError(key as keyof FormValues, { message });
                    }
                }
                return;
            }
            toast.push(err instanceof Error ? err.message : '建立專案失敗', 'error');
        },
    });

    return (
        <>
            <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                onClick={() => setOpen(true)}
            >
                {triggerLabel}
            </button>

            {open ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" role="dialog">
                    <div className="w-full max-w-lg rounded-lg border bg-white p-5 shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-base font-semibold">建立專案</div>
                                <div className="mt-1 text-sm text-slate-600">建立後會自動成為 Owner。</div>
                            </div>
                            <button
                                type="button"
                                className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                                onClick={() => setOpen(false)}
                            >
                                關閉
                            </button>
                        </div>

                        <form
                            className="mt-4 space-y-4"
                            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
                        >
                            <div>
                                <label className="text-sm font-medium">名稱</label>
                                <input className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('name')} />
                                {form.formState.errors.name?.message ? (
                                    <div className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</div>
                                ) : null}
                            </div>

                            <div>
                                <label className="text-sm font-medium">描述（可選）</label>
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                    {...form.register('description')}
                                />
                                {form.formState.errors.description?.message ? (
                                    <div className="mt-1 text-xs text-red-600">{form.formState.errors.description.message}</div>
                                ) : null}
                            </div>

                            <div>
                                <label className="text-sm font-medium">可見性</label>
                                <select className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('visibility')}>
                                    <option value="private">private</option>
                                    <option value="shared">shared</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="rounded border px-3 py-2 text-sm"
                                    onClick={() => setOpen(false)}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? '建立中…' : '建立'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
}
