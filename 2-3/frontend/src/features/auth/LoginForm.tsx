'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api } from '../../lib/api/client';
import { ApiError } from '../../lib/api/http';
import { zodForm } from '../../lib/forms/zodForm';
import { useToast } from '../../components/Toast';

const schema = z.object({
    email: z.string().email('請輸入正確 Email'),
    password: z.string().min(1, '請輸入密碼'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({ returnTo }: { returnTo: string }) {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();

    const form = useForm<FormValues>(zodForm<FormValues>(schema, { defaultValues: { email: '', password: '' } }));

    const mutation = useMutation({
        mutationFn: async (values: FormValues) => api.login(values),
        onSuccess: async (data) => {
            queryClient.setQueryData(['me'], data.user);
            toast.push('登入成功', 'success');
            router.replace(returnTo);
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                for (const [key, msgs] of Object.entries(err.fieldErrors)) {
                    const message = msgs?.[0];
                    if (!message) continue;
                    if (key === 'email' || key === 'password') {
                        form.setError(key as keyof FormValues, { message });
                    }
                }
                return;
            }
            toast.push(err instanceof Error ? err.message : '登入失敗', 'error');
        },
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold">登入</h1>
                <p className="mt-1 text-sm text-slate-600">使用你的帳號登入 Trello Lite。</p>

                <form
                    className="mt-6 space-y-4"
                    onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
                >
                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            autoComplete="email"
                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
                            {...form.register('email')}
                        />
                        {form.formState.errors.email?.message ? (
                            <div className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</div>
                        ) : null}
                    </div>

                    <div>
                        <label className="text-sm font-medium">密碼</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
                            {...form.register('password')}
                        />
                        {form.formState.errors.password?.message ? (
                            <div className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</div>
                        ) : null}
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? '登入中…' : '登入'}
                    </button>
                </form>

                <div className="mt-4 text-sm text-slate-600">
                    還沒有帳號？{' '}
                    <Link className="font-medium text-slate-900" href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
                        註冊
                    </Link>
                </div>
            </div>
        </div>
    );
}
