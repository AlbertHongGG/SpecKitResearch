import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const schema = z.object({
  email: z.string().email('Email 格式不正確'),
  password: z.string().min(8, '密碼至少 8 碼'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as any
  const { login } = useAuth()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const from = location.state?.from?.pathname ?? '/'

  async function onSubmit(values: FormValues) {
    const result = await login.mutateAsync(values)
    if (result.access_token) {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-xl font-semibold">登入</h1>
      <p className="mt-1 text-sm text-gray-600">使用 seed 帳號登入測試。</p>

      {login.isError ? (
        <div className="mt-4">
          <Alert title="登入失敗" description={(login.error as any)?.message ?? '請稍後重試'} />
        </div>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="text-sm font-medium">Email</label>
          <div className="mt-1">
            <Input type="email" autoComplete="email" {...form.register('email')} />
          </div>
          {form.formState.errors.email ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.email.message}</div>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-medium">Password</label>
          <div className="mt-1">
            <Input type="password" autoComplete="current-password" {...form.register('password')} />
          </div>
          {form.formState.errors.password ? (
            <div className="mt-1 text-xs text-red-700">{form.formState.errors.password.message}</div>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? '登入中…' : '登入'}
        </Button>
      </form>

      <div className="mt-4 rounded-md border bg-white p-3 text-sm">
        <div className="font-medium">Seed 帳號</div>
        <ul className="mt-1 list-disc pl-5 text-gray-700">
          <li>admin@example.com / admin1234</li>
          <li>member@example.com / member1234</li>
        </ul>
      </div>
    </div>
  )
}
