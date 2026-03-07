'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { apiRequest } from '@/services/api/client';

type FormValues = { email: string; password: string };

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Sign Up</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(values) });
          router.push('/login');
        })}
      >
        <Input label="Email" type="email" {...register('email', { required: true })} />
        <Input
          label="Password"
          type="password"
          {...register('password', { required: true, minLength: 8 })}
        />
        <Button type="submit" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </main>
  );
}
