import { useEffect, useMemo, useState } from 'react'
import { subscribeToToasts, type ToastInput } from '../../lib/notifications'

type ToastItem = ToastInput & { id: string }

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toneClasses(type: ToastInput['type']): string {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    default:
      return 'border-gray-200 bg-white text-gray-900'
  }
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useMemo(() => {
    return (id: string) => setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    return subscribeToToasts((toast) => {
      const id = makeId()
      setItems((prev) => [...prev, { ...toast, id }])
      window.setTimeout(() => dismiss(id), toast.type === 'error' ? 5000 : 3500)
    })
  }, [dismiss])

  return (
    <>
      {props.children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-md border p-3 shadow-sm ${toneClasses(t.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description ? <div className="mt-1 text-sm opacity-90">{t.description}</div> : null}
              </div>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm opacity-70 hover:opacity-100"
                onClick={() => dismiss(t.id)}
                aria-label="關閉通知"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
