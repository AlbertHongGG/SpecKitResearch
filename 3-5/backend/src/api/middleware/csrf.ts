import type { FastifyReply, FastifyRequest } from 'fastify';

import { CsrfError } from '../httpErrors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function requireCsrf(request: FastifyRequest, _reply: FastifyReply) {
    void _reply;
    if (SAFE_METHODS.has(request.method)) return;

    const header = request.headers['x-csrf'];
    const value = Array.isArray(header) ? header[0] : header;

    // Minimal CSRF defense: require a non-simple header for unsafe methods.
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
        throw new CsrfError();
    }
}
