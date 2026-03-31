import { useSyncExternalStore } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  role: 'USER' | 'PROVIDER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

const STORAGE_KEY = 'smartbooking.auth';

let state: AuthState = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user: parsed.user ?? null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function saveToStorage(next: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthSnapshot(): AuthState {
  return state;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
}

export function setAuthToken(token: string | null) {
  state = { ...state, token };
  saveToStorage(state);
  emit();
}

export function setAuthUser(user: AuthUser | null) {
  state = { ...state, user };
  saveToStorage(state);
  emit();
}

export function clearAuth() {
  state = { token: null, user: null };
  saveToStorage(state);
  emit();
}
