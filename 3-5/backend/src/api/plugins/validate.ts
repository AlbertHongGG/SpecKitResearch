import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../httpErrors.js';

declare module 'fastify' {
    interface FastifyInstance {
        validate<T>(schema: ZodSchema<T>, data: unknown): T;
    }
}

export const validatePlugin: FastifyPluginAsync = fp(async (app) => {
    app.decorate('validate', (schema, data) => {
        try {
            return schema.parse(data);
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors: Record<string, string[]> = {};
                for (const issue of error.issues) {
                    const key = issue.path.join('.') || 'body';
                    fieldErrors[key] = fieldErrors[key] ?? [];
                    fieldErrors[key].push(issue.message);
                }
                throw new ValidationError(fieldErrors);
            }
            throw error;
        }
    });
});

export default validatePlugin;
