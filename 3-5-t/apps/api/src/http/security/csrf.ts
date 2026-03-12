import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../errors';
import type { AppConfig } from '../../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function enforceCsrf(req: FastifyRequest, _reply: FastifyReply, config: AppConfig) {
  if (SAFE_METHODS.has(req.method)) return;

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const allowed = config.WEB_ORIGIN;

  const okOrigin = typeof origin === 'string' && origin.startsWith(allowed);
  const okReferer = typeof referer === 'string' && referer.startsWith(allowed);

  if (!okOrigin && !okReferer) {
    throw new HttpError(403, 'CSRF_BLOCKED', 'CSRF check failed');
  }
}
