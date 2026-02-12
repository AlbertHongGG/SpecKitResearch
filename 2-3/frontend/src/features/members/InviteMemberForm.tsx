'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/http';
import { zodForm } from '../../lib/forms/zodForm';
import { useToast } from '../../components/Toast';

const schema = z.object({
    email: z.string().email('請輸入正確 Email'),
    invitedRole: z.enum(['admin', 'member', 'viewer']).default('member'),
});

type FormValues = z.infer<typeof schema>;

export function InviteMemberForm({ projectId }: { projectId: string }) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const form = useForm<FormValues>(
        zodForm<FormValues>(schema, { defaultValues: { email: '', invitedRole: 'member' } }),
    );

    const mutation = useMutation({
        mutationFn: (values: FormValues) => api.createInvitation(projectId, { email: values.email, invitedRole: values.invitedRole }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });
            toast.push('已送出邀請', 'success');
            form.reset();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                for (const [key, msgs] of Object.entries(err.fieldErrors)) {
                    const message = msgs?.[0];
                    if (!message) continue;
                    if (key === 'email' || key === 'invitedRole') {
                        form.setError(key as keyof FormValues, { message });
                    }
                }
                return;
            }
            toast.push(err instanceof Error ? err.message : '邀請失敗', 'error');
        },
    });

    return (
        <form
            className="rounded-lg border bg-white p-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
            <div className="text-sm font-medium">邀請成員</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                    <label className="text-xs text-slate-600">Email</label>
                    <input className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('email')} />
                    {form.formState.errors.email?.message ? (
                        <div className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</div>
                    ) : null}
                </div>
                <div>
                    <label className="text-xs text-slate-600">角色</label>
                    <select className="mt-1 w-full rounded border px-3 py-2 text-sm" {...form.register('invitedRole')}>
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                        <option value="viewer">viewer</option>
                    </select>
                </div>
            </div>
            <div className="mt-3 flex justify-end">
                <button
                    type="submit"
                    className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? '送出中…' : '送出邀請'}
                </button>
            </div>
        </form>
    );
}
