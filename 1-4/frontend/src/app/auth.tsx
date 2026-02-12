import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'

type AuthState = {
  status: 'booting' | 'anonymous' | 'authenticated'
  user: authApi.ApiUser | null
  token: string | null
  refreshToken: string | null
}

type AuthContextValue = {
  state: AuthState
  login: (params: { email: string; password: string }) => Promise<void>
  register: (params: {
    email: string
    password: string
    passwordConfirm: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = authApi.getStoredAuth()
    if (!stored) {
      return {
        status: 'anonymous',
        user: null,
        token: null,
        refreshToken: null,
      }
    }
    return {
      status: 'booting',
      user: null,
      token: stored.token,
      refreshToken: stored.refreshToken,
    }
  })

  useEffect(() => {
    const refreshToken = state.refreshToken
    if (!refreshToken) return

    let cancelled = false
    ;(async () => {
      try {
        const refreshed = await authApi.refresh({ refreshToken })
        if (cancelled) return

        authApi.setStoredAuth({
          token: refreshed.token,
          refreshToken: refreshed.refresh_token,
        })

        setState({
          status: 'authenticated',
          user: refreshed.user,
          token: refreshed.token,
          refreshToken: refreshed.refresh_token,
        })
      } catch {
        authApi.clearStoredAuth()
        if (!cancelled) {
          setState({
            status: 'anonymous',
            user: null,
            token: null,
            refreshToken: null,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state.refreshToken])

  const value = useMemo<AuthContextValue>(() => {
    return {
      state,
      login: async (params) => {
        const res = await authApi.login(params)
        authApi.setStoredAuth({
          token: res.token,
          refreshToken: res.refresh_token,
        })
        setState({
          status: 'authenticated',
          user: res.user,
          token: res.token,
          refreshToken: res.refresh_token,
        })
      },
      register: async (params) => {
        await authApi.register(params)
        // keep anonymous; UX can redirect to login
        setState((s) => ({ ...s, status: 'anonymous' }))
      },
      logout: async () => {
        const token = state.token
        authApi.clearStoredAuth()
        setState({
          status: 'anonymous',
          user: null,
          token: null,
          refreshToken: null,
        })
        if (token) {
          try {
            await authApi.logout({ token })
          } catch {
            // ignore
          }
        }
      },
    }
  }, [state])

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
