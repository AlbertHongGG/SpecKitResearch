import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { DomainError } from './domain-error'
import { ERROR_CODES } from './error-codes'
import { buildErrorResponse } from './error-response'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request & { requestId?: string }>()
    const response = ctx.getResponse<Response>()

    const requestId = request.requestId

    if (exception instanceof DomainError) {
      response.status(exception.status).json(
        buildErrorResponse({
          code: exception.code,
          message: exception.message,
          requestId,
        }),
      )
      return
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const raw = exception.getResponse() as any

      const message =
        typeof raw === 'string'
          ? raw
          : raw?.message
            ? Array.isArray(raw.message)
              ? raw.message.join('; ')
              : String(raw.message)
            : exception.message

      const code =
        status === HttpStatus.BAD_REQUEST
          ? ERROR_CODES.VALIDATION_ERROR
          : status === HttpStatus.UNAUTHORIZED
            ? ERROR_CODES.UNAUTHORIZED
            : status === HttpStatus.FORBIDDEN
              ? ERROR_CODES.FORBIDDEN
              : status === HttpStatus.NOT_FOUND
                ? ERROR_CODES.NOT_FOUND
                : status === HttpStatus.CONFLICT
                  ? ERROR_CODES.CONFLICT
                  : ERROR_CODES.INTERNAL_ERROR

      response.status(status).json(buildErrorResponse({ code, message, requestId }))
      return
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        buildErrorResponse({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal Server Error',
          requestId,
        }),
      )
  }
}
