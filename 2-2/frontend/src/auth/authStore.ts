export type UserRole = 'USER' | 'PROVIDER' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  status: 'ACTIVE' | 'SUSPENDED'
}

const TOKEN_KEY = 'sb.accessToken'
const USER_KEY = 'sb.user'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser | null) {
  if (!user) localStorage.removeItem(USER_KEY)
  else localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  setAccessToken(null)
  setAuthUser(null)
}
