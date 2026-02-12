import type { FastifyCorsOptions } from '@fastify/cors';
import { config } from './config.js';

export function getCorsOptions(): FastifyCorsOptions {
  return {
    origin: (origin, cb) => {
      // Allow non-browser tools (no Origin) and configured SPA origin.
      if (!origin) return cb(null, true);
      if (origin === config.CORS_ORIGIN) return cb(null, true);
      return cb(new Error('Origin not allowed'), false);
    },
    credentials: true,
  };
}
