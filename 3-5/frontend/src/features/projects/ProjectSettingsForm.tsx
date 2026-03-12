'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Project } from '../../lib/api/client';
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

export function ProjectSettingsForm({ project }: { project: Project }) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const form = useForm<FormValues>(
        zodForm<FormValues>(schema, {
            defaultValues: {
                name: project.name,
                description: project.description ?? '',
                visibility: project.visibility,
            },
        }),
    );

    const mutation = useMutation({
        mutationFn: async (values: FormValues) =>
            api.updateProject(project.id, {
                expectedVersion: project.version,
                name: values.name,
                description: values.description?.trim() ? values.description.trim() : '',
                visibility: values.visibility,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['snapshot', project.id] });
            await queryClient.invalidateQueries({ queryKey: ['myProjects'] });
            toast.push('已儲存設定', 'success');
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 409) {
                toast.push('版本衝突：請重新載入後再試一次', 'error');
                return;
            }
            toast.push(err instanceof Error ? err.message : '儲存失敗', 'error');
        },
    });

    return (
        <form className="rounded-lg border bg-white p-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <div className="text-sm font-medium">專案設定</div>

            <div className="mt-4 space-y-4">
                <div>
                    <label className="text-sm font-medium">名稱</label>
                    <input className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('name')} />
                    {form.formState.errors.name?.message ? (
                        <div className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</div>
                    ) : null}
                </div>

                <div>
                    <label className="text-sm font-medium">描述</label>
                    <textarea rows={4} className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('description')} />
                </div>

                <div>
                    <label className="text-sm font-medium">可見性</label>
                    <select className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('visibility')}>
                        <option value="private">private</option>
                        <option value="shared">shared</option>
                    </select>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    type="submit"
                    className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? '儲存中…' : '儲存'}
                </button>
            </div>
        </form>
    );
}
