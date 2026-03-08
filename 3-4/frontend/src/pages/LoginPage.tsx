import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login } from '../api/auth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useLocation, useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'user@example.com', password: 'user1234' },
  });

  const m = useMutation({
    mutationFn: (v: FormValues) => login(v.email, v.password),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['session'] });
      navigate(location.state?.from ?? '/orders');
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>

      {m.isError ? (
        <div className="mb-3">
          <Alert kind="error" title="Login failed">
            {(m.error as any)?.message ?? 'Unknown error'}
          </Alert>
        </div>
      ) : null}

      <form
        className="space-y-3 rounded-lg border bg-white p-4"
        onSubmit={form.handleSubmit((v) => m.mutate(v))}
      >
        <Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <Input
          label="Password"
          type="password"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <Button type="submit" disabled={m.isPending}>
          {m.isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="text-xs text-slate-600">
          Seed accounts: <code>user@example.com</code> / <code>user1234</code> , admin: <code>admin@example.com</code> / <code>admin1234</code>
        </div>
      </form>
    </div>
  );
}
