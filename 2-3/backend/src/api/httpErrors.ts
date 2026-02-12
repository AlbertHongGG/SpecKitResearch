export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;

    constructor(params: { statusCode: number; code: string; message: string }) {
        super(params.message);
        this.statusCode = params.statusCode;
        this.code = params.code;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Not authenticated') {
        super({ statusCode: 401, code: 'UNAUTHORIZED', message });
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Not authorized') {
        super({ statusCode: 403, code: 'FORBIDDEN', message });
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super({ statusCode: 404, code: 'NOT_FOUND', message });
    }
}

export class ValidationError extends AppError {
    readonly fieldErrors: FieldErrors;

    constructor(fieldErrors: FieldErrors, message = 'Validation error') {
        super({ statusCode: 422, code: 'VALIDATION_ERROR', message });
        this.fieldErrors = fieldErrors;
    }
}

export class ConflictError extends AppError {
    readonly latest?: unknown;

    constructor(params: { message?: string; latest?: unknown } = {}) {
        super({
            statusCode: 409,
            code: 'CONFLICT',
            message: params.message ?? 'Version conflict / ordering conflict',
        });
        this.latest = params.latest;
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super({ statusCode: 429, code: 'TOO_MANY_REQUESTS', message });
    }
}

export class CsrfError extends AppError {
    constructor(message = 'CSRF protection: missing or invalid header') {
        super({ statusCode: 403, code: 'CSRF', message });
    }
}
