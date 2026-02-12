import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { queryClient } from '../app/queryClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorState } from '../components/status/ErrorState';
import { useToast } from '../components/toast/ToastContext';

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof FormSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from ?? '/documents';
  const toast = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.success('登入成功');
      navigate(from, { replace: true });
    },
    onError: (e) => {
      toast.error('登入失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">登入</div>
        <div className="mt-1 text-sm text-slate-600">使用 seed 帳號：admin/user/reviewer1/reviewer2@example.com，密碼：password</div>

        {mutation.error ? <ErrorState title="登入失敗" error={mutation.error} /> : null}

        <form
          className="mt-4 space-y-3"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input data-testid="login-email" type="email" {...form.register('email')} />
            {form.formState.errors.email ? (
              <div className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</div>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">密碼</label>
            <Input data-testid="login-password" type="password" {...form.register('password')} />
            {form.formState.errors.password ? (
              <div className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</div>
            ) : null}
          </div>
          <Button data-testid="login-submit" type="submit" loading={mutation.isPending} className="w-full">
            登入
          </Button>
        </form>
      </div>
    </div>
  );
}
