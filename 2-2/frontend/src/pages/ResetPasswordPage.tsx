import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError, http } from '../api/http'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') ?? '', [params])
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await http<void>('/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      })
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`${err.code}: ${err.message} (requestId: ${err.requestId})`)
      } else {
        setError('Reset failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Reset password</h1>
        <div className="mt-4">
          <Alert tone="error" message="Missing reset token." />
        </div>
        <div className="mt-4 text-sm">
          <Link to="/forgot-password" className="text-blue-700 hover:text-blue-800">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Reset password</h1>
      <p className="mt-1 text-sm text-gray-600">Enter a new password (min 8 characters).</p>

      {error ? (
        <div className="mt-4">
          <Alert tone="error" message={error} />
        </div>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>

      <div className="mt-4 text-sm">
        <Link to="/login" className="text-gray-700 hover:text-gray-900">
          Back to login
        </Link>
      </div>
    </div>
  )
}
