import { API_BASE_URL } from './config'

export type ApiError = {
  code: string
  message: string
  details?: unknown
  request_id?: string
}

export class HttpError extends Error {
  readonly status: number
  readonly apiError?: ApiError

  constructor(params: {
    status: number
    message: string
    apiError?: ApiError
  }) {
    super(params.message)
    this.name = 'HttpError'
    this.status = params.status
    this.apiError = params.apiError
  }
}

export type HttpErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unknown'

export function getHttpErrorKind(error: unknown): HttpErrorKind {
  if (!(error instanceof HttpError)) return 'unknown'

  switch (error.status) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    default:
      return 'unknown'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function tryParseApiError(payload: unknown): ApiError | undefined {
  if (!isRecord(payload)) return undefined
  const error = payload['error']
  if (!isRecord(error)) return undefined
  const code = error['code']
  const message = error['message']
  if (typeof code !== 'string' || typeof message !== 'string') return undefined

  const details = error['details']
  const requestId = error['request_id']

  return {
    code,
    message,
    details,
    request_id: typeof requestId === 'string' ? requestId : undefined,
  }
}

export async function apiRequest<T>(params: {
  path: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  token?: string
  body?: unknown
}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${params.path}`, {
    method: params.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(params.token ? { authorization: `Bearer ${params.token}` } : {}),
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  const payload = isJson ? ((await res.json()) as unknown) : await res.text()

  if (!res.ok) {
    const apiError = tryParseApiError(payload)
    throw new HttpError({
      status: res.status,
      message: apiError?.message ?? `HTTP ${res.status}`,
      apiError,
    })
  }

  return payload as T
}
