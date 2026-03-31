import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiFetch } from '../../api/http';

const Schema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

type FormData = z.infer<typeof Schema>;

export function ResetPasswordForm({ token, onDone }: { token?: string; onDone: () => void }) {
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { token: token ?? '', newPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    await apiFetch('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Password reset</h2>
        <p className="mt-2 text-sm">Your password has been reset.</p>
        <button type="button" className="mt-3 underline" onClick={onDone}>
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reset password</h2>
      </div>

      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm" htmlFor="reset-token">
            Token
          </label>
          <input
            id="reset-token"
            className="mt-1 w-full rounded border px-3 py-2"
            {...form.register('token')}
          />
          {form.formState.errors.token ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.token.message}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm" htmlFor="reset-new-password">
            New password
          </label>
          <input
            id="reset-new-password"
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            {...form.register('newPassword')}
          />
          {form.formState.errors.newPassword ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.newPassword.message}</p>
          ) : null}
        </div>

        <button
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        <button type="button" className="ml-3 underline" onClick={onDone}>
          Back
        </button>
      </form>
    </div>
  );
}
