import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ConflictError, ValidationError } from '../httpErrors.js';

export const errorHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
    app.setErrorHandler((error, request, reply) => {
        const requestId = request.id;

        if (error instanceof ValidationError) {
            reply.status(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    requestId,
                    fieldErrors: error.fieldErrors,
                },
            });
            return;
        }

        if (error instanceof ZodError) {
            const fieldErrors: Record<string, string[]> = {};
            for (const issue of error.issues) {
                const key = issue.path.join('.') || 'body';
                fieldErrors[key] = fieldErrors[key] ?? [];
                fieldErrors[key].push(issue.message);
            }

            reply.status(422).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation error',
                    requestId,
                    fieldErrors,
                },
            });
            return;
        }

        if (error instanceof ConflictError) {
            reply.status(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    requestId,
                },
                ...(error.latest ? { latest: error.latest } : {}),
            });
            return;
        }

        if (error instanceof AppError) {
            reply.status(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    requestId,
                },
            });
            return;
        }

        request.log.error({ err: error }, 'Unhandled error');
        reply.status(500).send({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
                requestId,
            },
        });
    });
});

export default errorHandlerPlugin;
