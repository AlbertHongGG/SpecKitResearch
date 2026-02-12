export type ToastType = 'success' | 'error' | 'info'

export type ToastInput = {
  type: ToastType
  title: string
  description?: string
}

type Listener = (toast: ToastInput) => void

const listeners = new Set<Listener>()

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitToast(toast: ToastInput) {
  for (const listener of listeners) {
    listener(toast)
  }
}

export function toastSuccess(title: string, description?: string) {
  emitToast({ type: 'success', title, description })
}

export function toastError(title: string, description?: string) {
  emitToast({ type: 'error', title, description })
}

export function toastInfo(title: string, description?: string) {
  emitToast({ type: 'info', title, description })
}
