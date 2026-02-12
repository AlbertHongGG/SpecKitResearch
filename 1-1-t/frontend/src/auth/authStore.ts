import { useSyncExternalStore } from 'react';

type AuthState = {
  token: string | null;
};

const STORAGE_KEY = 'amp.token';

let state: AuthState = {
  token: localStorage.getItem(STORAGE_KEY),
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getToken(): string | null {
  return state.token;
}

export function setToken(token: string) {
  state = { token };
  localStorage.setItem(STORAGE_KEY, token);
  emit();
}

export function clearToken() {
  state = { token: null };
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useAuth() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => state,
  );
}
