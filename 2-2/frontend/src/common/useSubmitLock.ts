import { useCallback, useRef, useState } from 'react'

export function useSubmitLock() {
  const [isLocked, setIsLocked] = useState(false)
  const inflight = useRef<Promise<unknown> | null>(null)

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (isLocked) return undefined

      setIsLocked(true)
      const p = fn()
      inflight.current = p

      try {
        return await p
      } finally {
        if (inflight.current === p) inflight.current = null
        setIsLocked(false)
      }
    },
    [isLocked],
  )

  return { isLocked, run }
}
