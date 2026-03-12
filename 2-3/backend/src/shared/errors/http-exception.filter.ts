import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ErrorCodes, type ErrorCode } from './error.codes';
import { toErrorResponse } from './error.response';

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCodes.BadRequest;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.Unauthorized;
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.Forbidden;
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.NotFound;
    case HttpStatus.CONFLICT:
      return ErrorCodes.Conflict;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCodes.RateLimited;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCodes.ServiceUnavailable;
    default:
      return status >= 500 ? ErrorCodes.Internal : ErrorCodes.BadRequest;
  }
}

function extractMessage(responseBody: unknown): string | undefined {
  if (!responseBody) return undefined;
  if (typeof responseBody === 'string') return responseBody;

  if (typeof responseBody === 'object') {
    const r: any = responseBody;

    const msg = r?.error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();

    const message = r?.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
    if (Array.isArray(message) && message.length && typeof message[0] === 'string') return String(message[0]);
  }

  return undefined;
}

function extractCode(responseBody: unknown): ErrorCode | undefined {
  if (!responseBody || typeof responseBody !== 'object') return undefined;
  const code = (responseBody as any)?.error?.code;
  return typeof code === 'string' ? (code as ErrorCode) : undefined;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = (request as any).requestId as string | undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      responseBody = exception.getResponse();
    }

    const code = extractCode(responseBody) ?? mapStatusToCode(status);
    const message =
      extractMessage(responseBody) ??
      (status >= 500 ? 'Internal server error' : 'Request failed');

    reply.status(status).send(toErrorResponse({ code, message, requestId }));
  }
}
