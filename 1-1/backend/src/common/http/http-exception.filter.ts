import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'
import { makeError, type ErrorResponse } from './error-response'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()

      if (isErrorResponse(payload)) {
        res.status(status).json(payload)
        return
      }

      res.status(status).json(makeFallbackError(status, exception, payload))
      return
    }

    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(makeError('INTERNAL', 'Internal server error'))
  }
}

function makeFallbackError(status: number, exception: HttpException, payload: unknown): ErrorResponse {
  const extractedMessage = extractMessage(payload) ?? exception.message ?? 'Request failed'

  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return makeError('AUTH_REQUIRED', '請先登入')
    case HttpStatus.FORBIDDEN:
      return makeError('FORBIDDEN', '權限不足')
    case HttpStatus.NOT_FOUND:
      return makeError('NOT_FOUND', extractedMessage)
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return makeError('VALIDATION_FAILED', extractedMessage)
    case HttpStatus.CONFLICT:
      return makeError('CONFLICT', extractedMessage)
    default:
      return makeError('INTERNAL', extractedMessage)
  }
}

function extractMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const p = payload as any
  if (typeof p.message === 'string') return p.message
  if (Array.isArray(p.message)) return p.message.join(', ')
  return undefined
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as any
  return typeof p.code === 'string' && typeof p.message === 'string'
}
