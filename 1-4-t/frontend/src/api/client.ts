import { authStore } from '../app/auth/authStore'
import type { ApiError } from './errors'
import { parseErrorResponse } from './errors'

const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const url = `${baseUrl ?? ''}${path}`

  const headers = new Headers(init?.headers)
  headers.set('accept', 'application/json')

  if (init?.json !== undefined) {
    headers.set('content-type', 'application/json')
  }

  const { token } = authStore.getState()
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  })

  if (!res.ok) {
    const parsed = await parseErrorResponse(res)
    const err: ApiError = {
      status: res.status,
      code: parsed.code,
      message: parsed.message,
      requestId: parsed.requestId ?? null,
    }
    throw err
  }

  return (await res.json()) as T
}
