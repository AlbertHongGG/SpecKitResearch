import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLoginMutation } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../components/forms/FormField';
import { useToast } from '../components/ErrorBoundary';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const login = useLoginMutation();
  const navigate = useNavigate();
  const toast = useToast();

  async function onSubmit(values: FormValues) {
    try {
      await login.mutateAsync(values);
      toast.success('登入成功');
      navigate('/orders');
    } catch (e: any) {
      toast.error(e?.message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        className="w-full max-w-sm rounded-xl bg-white/5 border border-white/10 p-6 shadow"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h1 className="text-xl font-semibold">Login</h1>
        <div className="mt-4">
          <FormField label="Email" id="email" error={errors.email?.message}>
            <input
              className="w-full rounded bg-black/30 border border-white/10 px-3 py-2"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Password" id="password" error={errors.password?.message}>
            <input
              className="w-full rounded bg-black/30 border border-white/10 px-3 py-2"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </FormField>
        </div>
        <button
          className="mt-6 w-full rounded bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 px-3 py-2 font-medium"
          type="submit"
          disabled={isSubmitting || login.isPending}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        {login.isError ? (
          <p className="mt-3 text-sm text-red-300">{(login.error as any)?.message ?? 'Login failed'}</p>
        ) : null}
      </form>
    </div>
  );
}

