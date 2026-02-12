import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

export type Toast = {
  id: string
  title: string
  message?: string
  variant: ToastVariant
}

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, 'id'> & { durationMs?: number }) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function variantClasses(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'info':
    default:
      return 'border-gray-200 bg-white text-gray-900'
  }
}

export function ToastProvider(props: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'> & { durationMs?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const durationMs = toast.durationMs ?? 3500

      setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 5))

      const handle = window.setTimeout(() => {
        dismissToast(id)
      }, durationMs)
      timers.current.set(id, handle)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [pushToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {props.children}

      <div className="pointer-events-none fixed right-4 top-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded border p-3 shadow-sm ${variantClasses(t.variant)}`}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.message ? (
                  <div className="mt-1 text-sm opacity-80">{t.message}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded border bg-white/60 px-2 py-1 text-xs"
                onClick={() => dismissToast(t.id)}
              >
                關閉
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
