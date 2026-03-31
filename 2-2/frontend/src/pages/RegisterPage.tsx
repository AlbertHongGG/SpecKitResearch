import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError, http } from '../api/http'
import type { AuthUser, UserRole } from '../auth/authStore'
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

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('USER')
  const [error, setError] = useState<unknown>(null)
  const submitLock = useSubmitLock()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await submitLock.run(async () => {
      try {
        const res = await http<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, role }),
        })
        setAccessToken(res.accessToken)
        setAuthUser(res.user)
        navigate('/services', { replace: true })
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err)
        } else {
          setError(new Error('Registration failed'))
        }
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Register</h1>
      <p className="mt-1 text-sm text-gray-600">Create a User or Provider account.</p>

      {error ? (
        <div className="mt-4">
          <ApiErrorBanner error={error} fallbackMessage="Registration failed" />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-800">Role</div>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="role"
              value="USER"
              checked={role === 'USER'}
              onChange={() => setRole('USER')}
            />
            User
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="role"
              value="PROVIDER"
              checked={role === 'PROVIDER'}
              onChange={() => setRole('PROVIDER')}
            />
            Provider
          </label>
        </div>

        <Button type="submit" disabled={submitLock.isLocked} className="w-full">
          {submitLock.isLocked ? 'Creating…' : 'Register'}
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
