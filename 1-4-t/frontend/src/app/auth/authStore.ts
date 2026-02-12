export type AuthUser = {
  id: string
  email: string
  role: 'Customer' | 'Agent' | 'Admin'
}

export type AuthState = {
  token: string | null
  user: AuthUser | null
}

type Listener = (state: AuthState) => void

const STORAGE_KEY = 'helpdesk.auth'

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw)
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user: parsed.user ?? null,
    }
  } catch {
    return { token: null, user: null }
  }
}

let state: AuthState = typeof window === 'undefined' ? { token: null, user: null } : load()
const listeners = new Set<Listener>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export const authStore = {
  getState(): AuthState {
    return state
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  setAuth(next: AuthState) {
    state = next
    persist()
    for (const l of listeners) l(state)
  },
  logout() {
    state = { token: null, user: null }
    persist()
    for (const l of listeners) l(state)
  },
}
