import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

export const REQUEST_ID_HEADER = 'x-request-id'

export function ensureRequestId(req: Request, res: Response): string {
  const existing = req.header(REQUEST_ID_HEADER)
  const requestId = existing && existing.trim().length > 0 ? existing : randomUUID()

  ;(req as any).requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)

  return requestId
}

export function getRequestId(req: Request): string | undefined {
  return (req as any).requestId
}
