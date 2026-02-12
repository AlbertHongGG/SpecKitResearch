import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/http'
import type { LoginRequest, LoginResponse, MeResponse, UserPublic } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import { authStorage } from './authStorage'

const meQueryKey = ['me'] as const

export function useMe() {
  const token = authStorage.getToken()
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<MeResponse>('/me'),
    enabled: !!token,
  })
}

export function useAuth() {
  const me = useMe()

  const login = useMutation({
    mutationFn: (body: LoginRequest) => apiFetch<LoginResponse>('/auth/login', { method: 'POST', json: body }),
    onSuccess: async (data) => {
      authStorage.setToken(data.access_token)
      queryClient.setQueryData(meQueryKey, { user: data.user })
    },
  })

  const logout = useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      authStorage.clearToken()
      await queryClient.invalidateQueries({ queryKey: meQueryKey })
    },
  })

  const user: UserPublic | null = me.data?.user ?? null

  return {
    user,
    isLoading: me.isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  }
}
