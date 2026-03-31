import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Request, Response } from 'express'

import { env } from '../config/env'
import { ErrorCodes } from '../errors/error-codes'
import { ensureRequestId, getRequestId, REQUEST_ID_HEADER } from './response'

type ErrorResponse = {
  code: string
  message: string
  requestId: string
  details?: Record<string, unknown> | null
}

function normalizeHttpExceptionResponse(response: unknown): {
  code?: string
  message?: string
  details?: Record<string, unknown> | null
} {
  if (typeof response === 'string') {
    return { message: response }
  }
  if (!response || typeof response !== 'object') return {}
  const obj = response as any

  const message =
    typeof obj.message === 'string'
      ? obj.message
      : Array.isArray(obj.message)
        ? obj.message.filter((x: unknown) => typeof x === 'string').join('; ')
        : typeof obj.error === 'string'
          ? obj.error
          : undefined

  return {
    code: typeof obj.code === 'string' ? obj.code : undefined,
    message,
    details: obj.details ?? null,
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCodes.BAD_REQUEST
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.UNAUTHORIZED
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.NOT_FOUND
    case HttpStatus.CONFLICT:
      return ErrorCodes.CONFLICT
    default:
      return ErrorCodes.INTERNAL_ERROR
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'Bad request'
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized'
    case HttpStatus.FORBIDDEN:
      return 'Forbidden'
    case HttpStatus.NOT_FOUND:
      return 'Not found'
    case HttpStatus.CONFLICT:
      return 'Conflict'
    default:
      return 'Internal server error'
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    const requestId = getRequestId(req) ?? ensureRequestId(req, res)
    res.setHeader(REQUEST_ID_HEADER, requestId)

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code: string = ErrorCodes.INTERNAL_ERROR
    let message = 'Internal server error'
    let details: Record<string, unknown> | null | undefined = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const normalized = normalizeHttpExceptionResponse(exception.getResponse())
      code = normalized.code ?? defaultCodeForStatus(status)
      message = normalized.message ?? exception.message

      // Nest built-in exceptions sometimes produce generic messages like
      // "Not Found" / "Forbidden"; ensure we always return something
      // user-actionable and stable for common business statuses.
      if (!message || message === 'Http Exception') {
        message = defaultMessageForStatus(status)
      }
      details = normalized.details
    } else {
      if (env.NODE_ENV !== 'production') {
        console.error(exception)
      }
    }

    const body: ErrorResponse = {
      code,
      message,
      requestId,
      ...(details !== undefined ? { details } : {}),
    }

    res.status(status).json(body)
  }
}
