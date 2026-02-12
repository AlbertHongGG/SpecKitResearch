export type ApiError = {
  status: number
  code?: string
  message: string
  requestId?: string | null
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as any).status === 'number' &&
    'message' in err
  )
}

export async function parseErrorResponse(
  res: Response,
): Promise<{ code?: string; message: string; requestId?: string | null }> {
  try {
    const data = await res.json()
    const code = data?.error?.code
    const message = data?.error?.message ?? res.statusText
    const requestId = data?.error?.request_id ?? null
    return { code, message, requestId }
  } catch {
    return { message: res.statusText }
  }
}
