import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { apiFetch } from './client'
import { authStore } from '../app/auth/authStore'

export type AuthUser = {
  id: string
  email: string
  role: 'Customer' | 'Agent' | 'Admin'
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type RegisterRequest = {
  email: string
  password: string
  password_confirm: string
}

export type LoginRequest = {
  email: string
  password: string
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) => apiFetch<AuthResponse>('/auth/register', { method: 'POST', json: body }),
    onSuccess: (data) => {
      authStore.setAuth({ token: data.token, user: data.user })
    },
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) => apiFetch<AuthResponse>('/auth/login', { method: 'POST', json: body }),
    onSuccess: (data) => {
      authStore.setAuth({ token: data.token, user: data.user })
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      authStore.logout()
    },
  })
}

export function useMe() {
  const token = authStore.getState().token
  const q = useQuery({
    queryKey: ['auth', 'me'],
    enabled: !!token,
    queryFn: () => apiFetch<AuthUser>('/auth/me'),
    retry: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!q.data) return
    const existing = authStore.getState()
    if (!existing.token) return
    authStore.setAuth({ token: existing.token, user: q.data })
  }, [q.data])

  return q
}
