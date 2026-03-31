import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiPostJson } from '../../api/http';
import { ForgotPasswordResponseSchema } from '../../api/schemas';

const Schema = z
  .object({
    email: z.string().email(),
  })
  .strict();

type FormData = z.infer<typeof Schema>;

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    await apiPostJson('/auth/password/forgot', data, ForgotPasswordResponseSchema);
    setDone(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Forgot password</h2>
        <p className="mt-1 text-sm text-gray-600">
          If the email exists, we will accept the request.
        </p>
      </div>

      {done ? (
        <div className="rounded border bg-white p-4">
          <p className="text-sm">Request accepted. Check your email for a reset link.</p>
          <button type="button" className="mt-3 underline" onClick={onBack}>
            Back to login
          </button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm" htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              className="mt-1 w-full rounded border px-3 py-2"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <button
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          <button type="button" className="ml-3 underline" onClick={onBack}>
            Back
          </button>
        </form>
      )}
    </div>
  );
}
