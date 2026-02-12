import { apiRequest } from './http'

export type ApiUserRole = 'Customer' | 'Agent' | 'Admin'

export type ApiUser = {
  id: string
  email: string
  role: ApiUserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LoginResponse = {
  token: string
  refresh_token: string
  user: ApiUser
}

export type AuthUserResponse = {
  user: ApiUser
}

const STORAGE_KEY = 'helpdesk.auth'

export function getStoredAuth(): {
  token: string
  refreshToken: string
} | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { token?: unknown }).token === 'string' &&
      typeof (parsed as { refreshToken?: unknown }).refreshToken === 'string'
    ) {
      return {
        token: (parsed as { token: string }).token,
        refreshToken: (parsed as { refreshToken: string }).refreshToken,
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function setStoredAuth(params: { token: string; refreshToken: string }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token: params.token, refreshToken: params.refreshToken }),
  )
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function register(params: {
  email: string
  password: string
  passwordConfirm: string
}): Promise<AuthUserResponse> {
  return apiRequest<AuthUserResponse>({
    path: '/auth/register',
    method: 'POST',
    body: {
      email: params.email,
      password: params.password,
      password_confirm: params.passwordConfirm,
    },
  })
}

export async function login(params: {
  email: string
  password: string
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>({
    path: '/auth/login',
    method: 'POST',
    body: { email: params.email, password: params.password },
  })
}

export async function refresh(params: {
  refreshToken: string
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>({
    path: '/auth/refresh',
    method: 'POST',
    body: { refresh_token: params.refreshToken },
  })
}

export async function logout(params: {
  token: string
}): Promise<{ success: true }> {
  return apiRequest<{ success: true }>({
    path: '/auth/logout',
    method: 'POST',
    token: params.token,
  })
}
