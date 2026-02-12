import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../app/auth'

const Schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict()

type FormValues = z.infer<typeof Schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await login(values)
    navigate('/', { replace: true })
  })

  return (
    <div className="mx-auto max-w-sm rounded border bg-white p-4">
      <h1 className="text-lg font-semibold">登入</h1>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="text-sm" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            type="email"
            autoComplete="email"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <div className="mt-1 text-xs text-red-600">
              {form.formState.errors.email.message}
            </div>
          ) : null}
        </div>

        <div>
          <label className="text-sm" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <div className="mt-1 text-xs text-red-600">
              {form.formState.errors.password.message}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {form.formState.isSubmitting ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  )
}
