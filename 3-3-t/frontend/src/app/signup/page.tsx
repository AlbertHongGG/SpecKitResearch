"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiFetch } from '@/services/http/client';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});

type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
    router.push('/login');
  };

  return (
    <main className="container-page">
      <form className="card mx-auto max-w-md space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-xl font-semibold">Sign Up</h1>
        <input className="w-full rounded border px-3 py-2" placeholder="Email" {...register('email')} />
        {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
        <input type="password" className="w-full rounded border px-3 py-2" placeholder="Password" {...register('password')} />
        {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
        <input className="w-full rounded border px-3 py-2" placeholder="Organization Name" {...register('organizationName')} />
        {errors.organizationName ? <p className="text-xs text-red-600">{errors.organizationName.message}</p> : null}
        <button disabled={isSubmitting} className="rounded bg-black px-4 py-2 text-white">{isSubmitting ? 'Loading...' : 'Create Account'}</button>
      </form>
    </main>
  );
}
