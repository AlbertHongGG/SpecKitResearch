import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authEvents } from '../auth/authEvents'
import { authStore, type AuthState } from '../auth/authStore'

function useAuthState() {
  const [auth, setAuth] = useState<AuthState>(authStore.getState())
  useEffect(() => {
    return authStore.subscribe(setAuth)
  }, [])
  return auth
}

export function AppShell(props: { children: ReactNode }) {
  const auth = useAuthState()
  const navigate = useNavigate()

  useEffect(() => {
    return authEvents.on('unauthorized', (e) => {
      const redirectTo = e.detail.redirectTo
      const safe = redirectTo && redirectTo.startsWith('/') ? redirectTo : undefined
      navigate(`/login${safe ? `?redirectTo=${encodeURIComponent(safe)}` : ''}`, {
        replace: true,
      })
    })
  }, [navigate])

  const role = auth.user?.role

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold">
              Helpdesk
            </Link>
            {role === 'Customer' && (
              <Link to="/tickets" className="text-sm text-slate-600 hover:text-slate-900">
                我的工單
              </Link>
            )}
            {role === 'Agent' && (
              <Link to="/agent/tickets" className="text-sm text-slate-600 hover:text-slate-900">
                工作台
              </Link>
            )}
            {role === 'Admin' && (
              <Link to="/admin/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            {auth.user ? (
              <>
                <span className="text-slate-600">{auth.user.email}</span>
                <button
                  type="button"
                  className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
                  onClick={() => {
                    authStore.logout()
                    navigate('/login', { replace: true })
                  }}
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-700 hover:text-slate-900">
                  登入
                </Link>
                <Link to="/register" className="text-slate-700 hover:text-slate-900">
                  註冊
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{props.children}</main>
    </div>
  )
}
