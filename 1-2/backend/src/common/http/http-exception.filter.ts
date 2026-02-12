import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorResponse = {
    code: string;
    message: string;
    details?: unknown;
};

function toErrorResponse(exception: unknown): { status: number; body: ErrorResponse } {
    if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const res = exception.getResponse();

        if (typeof res === 'string') {
            return { status, body: { code: httpStatusToCode(status), message: res } };
        }

        if (typeof res === 'object' && res) {
            const anyRes = res as any;
            const message =
                typeof anyRes.message === 'string'
                    ? anyRes.message
                    : Array.isArray(anyRes.message)
                        ? 'Validation failed'
                        : exception.message;

            if (status === HttpStatus.BAD_REQUEST && Array.isArray(anyRes.message)) {
                return {
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                    body: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: anyRes.message,
                    },
                };
            }

            if (anyRes.code && typeof anyRes.code === 'string') {
                return { status, body: { code: anyRes.code, message, details: anyRes.details } };
            }

            return { status, body: { code: httpStatusToCode(status), message, details: anyRes.details } };
        }

        return { status, body: { code: httpStatusToCode(status), message: exception.message } };
    }

    return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
}

function httpStatusToCode(status: number): string {
    switch (status) {
        case HttpStatus.UNAUTHORIZED:
            return 'UNAUTHORIZED';
        case HttpStatus.FORBIDDEN:
            return 'FORBIDDEN';
        case HttpStatus.NOT_FOUND:
            return 'NOT_FOUND';
        case HttpStatus.CONFLICT:
            return 'CONFLICT';
        case HttpStatus.UNPROCESSABLE_ENTITY:
            return 'VALIDATION_ERROR';
        default:
            return 'HTTP_ERROR';
    }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const { status, body } = toErrorResponse(exception);
        response.status(status).json(body);
    }
}
