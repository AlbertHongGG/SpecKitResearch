import { useEffect, useState } from 'react'
import { authStore, type AuthState } from './authStore'

export function useAuth(): AuthState {
  const [auth, setAuth] = useState<AuthState>(authStore.getState())
    useEffect(() => {
      return authStore.subscribe(setAuth)
    }, [])
  return auth
}
