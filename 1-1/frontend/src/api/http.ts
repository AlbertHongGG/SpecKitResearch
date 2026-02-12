import { authStorage } from '../features/auth/authStorage'

export type ErrorResponse = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>

  constructor(params: { status: number; code: string; message: string; details?: Record<string, unknown> }) {
    super(params.message)
    this.status = params.status
    this.code = params.code
    this.details = params.details
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`
  const token = authStorage.getToken()

  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.json !== undefined) headers.set('content-type', 'application/json')

  const res = await fetch(url, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  if (!res.ok) {
    if (isJson) {
      const err = (await res.json()) as ErrorResponse
      throw new ApiError({
        status: res.status,
        code: err.code ?? 'UNKNOWN',
        message: err.message ?? 'Request failed',
        details: err.details,
      })
    }

    throw new ApiError({
      status: res.status,
      code: 'UNKNOWN',
      message: 'Request failed',
    })
  }

  if (res.status === 204) return undefined as T
  if (isJson) return (await res.json()) as T

  return (await res.text()) as unknown as T
}
