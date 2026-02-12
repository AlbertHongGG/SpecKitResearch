import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../app/auth'
import type { ApiUserRole } from '../api/auth'

export function GuestOnly() {
  const { state } = useAuth()

  if (state.status === 'booting') return null
  if (state.status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireAuth() {
  const { state } = useAuth()

  if (state.status === 'booting') return null
  if (state.status !== 'authenticated') return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole(props: { role: ApiUserRole }) {
  const { state } = useAuth()

  if (state.status === 'booting') return null
  if (state.status !== 'authenticated') return <Navigate to="/login" replace />
  if (state.user?.role !== props.role)
    return <Navigate to="/forbidden" replace />
  return <Outlet />
}
