import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { ensureRequestId, getRequestId } from '../http/response'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogMeta = Record<string, unknown>
type RequestWithActor = Request & { user?: { id?: string; role?: string } }

const SENSITIVE_KEYS = new Set([
  'authorization',
  'accessToken',
  'refreshToken',
  'token',
  'password',
  'passwordHash',
  'newPassword',
  'secret',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  )
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!isPlainObject(value)) return value

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = redact(v)
    }
  }
  return out
}

function write(level: LogLevel, message: string, meta?: LogMeta) {
  const payload = meta ? redact(meta) : undefined
  const line = payload ? `${message} ${JSON.stringify(payload)}` : message

  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  target(line)
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint()
    const requestId = getRequestId(req) ?? ensureRequestId(req, res)

    res.on('finish', () => {
      const end = process.hrtime.bigint()
      const durationMs = Number(end - start) / 1_000_000

      const actor = (req as RequestWithActor).user

      logger.info('http_request', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        actorUserId: actor?.id,
        actorRole: actor?.role,
      })
    })

    next()
  }
}
