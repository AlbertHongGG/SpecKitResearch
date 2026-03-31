import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { http, ApiError } from '../api/http'
import type { AuthUser } from '../auth/authStore'
import { setAccessToken, setAuthUser } from '../auth/authStore'
import { ApiErrorBanner } from '../components/ApiErrorBanner'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useSubmitLock } from '../common/useSubmitLock'

type AuthResponse = {
  user: AuthUser
  accessToken: string
  expiresAt: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const submitLock = useSubmitLock()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await submitLock.run(async () => {
      try {
        const res = await http<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setAccessToken(res.accessToken)
        setAuthUser(res.user)
        navigate('/services', { replace: true })
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err)
        } else {
          setError(new Error('Login failed'))
        }
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Login</h1>
      <p className="mt-1 text-sm text-gray-600">Sign in to manage your bookings.</p>

      {error ? (
        <div className="mt-4">
          <ApiErrorBanner error={error} fallbackMessage="Login failed" />
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
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" disabled={submitLock.isLocked} className="w-full">
          {submitLock.isLocked ? 'Signing in…' : 'Login'}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link to="/register" className="text-blue-700 hover:text-blue-800">
          Create account
        </Link>
        <Link to="/forgot-password" className="text-gray-700 hover:text-gray-900">
          Forgot password?
        </Link>
      </div>
    </div>
  )
}
