import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

export type RequestWithId = Request & { requestId?: string }

function makeRequestId(): string {
  try {
    return randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id')
  const requestId = incoming && incoming.length <= 128 ? incoming : makeRequestId()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}
