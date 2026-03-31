import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError, http } from '../api/http'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('idle')
    setIsSubmitting(true)
    try {
      await http<void>('/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setStatus('success')
    } catch (err) {
      // We still show a generic error for network failures.
      if (err instanceof ApiError) {
        setError(`${err.message} (requestId: ${err.requestId})`)
      } else {
        setError('Request failed')
      }
      setStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Forgot password</h1>
      <p className="mt-1 text-sm text-gray-600">We will always show a success message.</p>

      {status === 'success' ? (
        <div className="mt-4">
          <Alert
            tone="info"
            message="If the email exists, a reset link has been requested. Please check your inbox."
          />
        </div>
      ) : null}
      {status === 'error' && error ? (
        <div className="mt-4">
          <Alert tone="error" message={error} />
        </div>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting…' : 'Request reset link'}
        </Button>
      </form>

      <div className="mt-4 text-sm">
        <Link to="/login" className="text-blue-700 hover:text-blue-800">
          Back to login
        </Link>
      </div>
    </div>
  )
}
