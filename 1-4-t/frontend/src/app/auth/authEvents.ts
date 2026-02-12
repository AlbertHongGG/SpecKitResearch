type AuthEventMap = {
  unauthorized: CustomEvent<{ redirectTo?: string }>
}

const target = new EventTarget()

export const authEvents = {
  on<K extends keyof AuthEventMap>(type: K, handler: (event: AuthEventMap[K]) => void) {
    const wrapped = handler as EventListener
    target.addEventListener(type, wrapped)
    return () => target.removeEventListener(type, wrapped)
  },
  emitUnauthorized(payload?: { redirectTo?: string }) {
    target.dispatchEvent(new CustomEvent('unauthorized', { detail: payload ?? {} }))
  },
}
