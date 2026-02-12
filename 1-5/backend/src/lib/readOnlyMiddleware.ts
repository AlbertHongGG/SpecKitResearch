import type { FastifyRequest } from 'fastify';
import { config } from './config.js';
import { conflict } from './httpError.js';

export function enforceReadOnlyMode(request: FastifyRequest): void {
  if (!config.READ_ONLY_MODE) return;

  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  throw conflict('Read-only mode enabled');
}
