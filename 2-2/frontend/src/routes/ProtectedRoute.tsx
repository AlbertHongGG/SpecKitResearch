import { Navigate, Outlet } from 'react-router-dom'
import { getAuthUser } from '../auth/authStore'

export type ProtectedRouteProps = {
  requiredRoles?: Array<'USER' | 'PROVIDER' | 'ADMIN'>
}

export function ProtectedRoute({ requiredRoles }: ProtectedRouteProps) {
  const user = getAuthUser()
  if (!user) return <Navigate to="/login" replace />

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
