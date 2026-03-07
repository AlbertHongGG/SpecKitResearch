'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { apiRequest } from '@/services/api/client';

type FormValues = { email: string; password: string };

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Login</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(values) });
          router.push('/');
        })}
      >
        <Input label="Email" type="email" {...register('email', { required: true })} />
        <Input label="Password" type="password" {...register('password', { required: true })} />
        {errors.email || errors.password ? (
          <p className="text-sm text-red-700">Email and password are required.</p>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </main>
  );
}
