'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../../lib/validation';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';


type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    window.location.href = '/login';
  };

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">註冊</h1>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm">Email</label>
          <input className="w-full rounded border px-3 py-2" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm">密碼</label>
          <input type="password" className="w-full rounded border px-3 py-2" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          註冊
        </button>
      </form>
    </div>
  );
}
