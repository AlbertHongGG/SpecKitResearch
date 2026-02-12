'use client';

import { useSyncExternalStore } from 'react';

export type ToastItem = {
  id: string;
  variant: 'success' | 'error' | 'info';
  message: string;
  createdAt: number;
  durationMs: number;
};

type ToastState = {
  items: ToastItem[];
};

const listeners = new Set<() => void>();
let state: ToastState = { items: [] };

function emit() {
  for (const l of listeners) l();
}

function getSnapshot() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function addToast(input: Omit<ToastItem, 'id' | 'createdAt'>) {
  const id = makeId();
  const item: ToastItem = { id, createdAt: Date.now(), ...input };
  state = { items: [item, ...state.items].slice(0, 5) };
  emit();

  window.setTimeout(() => {
    dismiss(id);
  }, item.durationMs);

  return id;
}

export function dismiss(id: string) {
  const next = state.items.filter((t) => t.id !== id);
  if (next.length === state.items.length) return;
  state = { items: next };
  emit();
}

export const toast = {
  success(message: string, opts?: { durationMs?: number }) {
    addToast({ variant: 'success', message, durationMs: opts?.durationMs ?? 2500 });
  },
  error(message: string, opts?: { durationMs?: number }) {
    addToast({ variant: 'error', message, durationMs: opts?.durationMs ?? 4000 });
  },
  info(message: string, opts?: { durationMs?: number }) {
    addToast({ variant: 'info', message, durationMs: opts?.durationMs ?? 3000 });
  },
};

export function useToastState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
