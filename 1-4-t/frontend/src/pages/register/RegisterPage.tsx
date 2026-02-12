import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../../components/form/Input'
import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { useRegister } from '../../api/auth'
import { isApiError } from '../../api/errors'

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.password_confirm, {
    message: '密碼不一致',
    path: ['password_confirm'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const registerMutation = useRegister()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    await registerMutation.mutateAsync(values)
    navigate('/tickets', { replace: true })
  }

  const apiError = isApiError(registerMutation.error) ? registerMutation.error : null

  return (
    <div className="mx-auto max-w-md rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">註冊</h1>
      <p className="mt-1 text-sm text-slate-600">建立 Customer 帳號。</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          {...register('password_confirm')}
          error={errors.password_confirm?.message}
        />

        {apiError ? (
          <FormError
            message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
          />
        ) : null}

        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? '建立中…' : '建立帳號'}
        </Button>
      </form>

      <div className="mt-4 text-sm text-slate-600">
        已有帳號？{' '}
        <Link to="/login" className="text-slate-900 underline">
          登入
        </Link>
      </div>
    </div>
  )
}
