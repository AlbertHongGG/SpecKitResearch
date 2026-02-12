import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { createQueryClient } from './app/queryClient'
import { router } from './app/router'
import { AuthProvider, useAuth } from './features/auth/authStore'
import { useSession } from './features/auth/api/useSession'
import { isUnauthorized } from './api/errorHandling'

const queryClient = createQueryClient()

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const { user, setUser, clear } = useAuth()
  const session = useSession()

  if (session.isError) {
    if (isUnauthorized(session.error)) {
      if (user) clear()
      return <>{children}</>
    }

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-900">Session error</div>
            <div className="mt-2 text-sm text-slate-600">{(session.error as Error).message}</div>
            <button
              className="mt-4 rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              onClick={() => session.refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (session.isSuccess) {
    if (!user || user.id !== session.data.user.id) {
      setUser(session.data.user)
    }
  }

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
      </AuthProvider>
    </QueryClientProvider>
  )
}
