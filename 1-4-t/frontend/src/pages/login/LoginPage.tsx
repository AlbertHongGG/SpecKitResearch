import { useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../../components/form/Input'
import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { useLogin } from '../../api/auth'
import { isApiError } from '../../api/errors'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function getSafeRedirectTo(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  if (raw.includes('://')) return null
  return raw
}

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return getSafeRedirectTo(params.get('redirectTo'))
  }, [location.search])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    await login.mutateAsync(values)
    navigate(redirectTo ?? '/', { replace: true })
  }

  const apiError = isApiError(login.error) ? login.error : null

  return (
    <div className="mx-auto max-w-md rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">登入</h1>
      <p className="mt-1 text-sm text-slate-600">使用 email 與密碼登入。</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />

        {apiError ? (
          <FormError
            message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
          />
        ) : null}

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? '登入中…' : '登入'}
        </Button>
      </form>

      <div className="mt-4 text-sm text-slate-600">
        還沒有帳號？{' '}
        <Link to="/register" className="text-slate-900 underline">
          註冊
        </Link>
      </div>
    </div>
  )
}
