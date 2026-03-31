import { getAccessToken } from '../auth/authStore'

export type ErrorResponse = {
  code: string
  message: string
  requestId: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string
  readonly details?: unknown

  constructor(status: number, body: ErrorResponse) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.requestId = body.requestId
    this.details = body.details
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (!base) return 'http://localhost:3000'
  return base
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, getBaseUrl()).toString()

  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url, { ...init, headers })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const json = text ? (JSON.parse(text) as unknown) : undefined

  if (!res.ok) {
    const body = (json ?? {
      code: 'UNKNOWN_ERROR',
      message: 'Request failed',
      requestId: res.headers.get('x-request-id') ?? 'unknown',
    }) as ErrorResponse
    throw new ApiError(res.status, body)
  }

  return json as T
}
