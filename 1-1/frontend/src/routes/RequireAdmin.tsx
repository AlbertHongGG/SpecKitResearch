import { Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { Spinner } from '../components/ui/Spinner'

export function RequireAdmin() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <ForbiddenPage />
  }

  return <Outlet />
}
