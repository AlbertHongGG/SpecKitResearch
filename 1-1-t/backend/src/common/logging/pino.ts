import type { Options as PinoHttpOptions } from 'pino-http';
import { randomUUID } from 'node:crypto';

export function buildPinoHttpOptions(): PinoHttpOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    level: isProd ? 'info' : 'debug',
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.trim().length > 0) return header;
      if (Array.isArray(header) && header.length > 0 && header[0]) return header[0];
      return randomUUID();
    },
    customProps: (req) => ({
      requestId: (req as any).id,
    }),
    redact: {
      paths: ['req.headers.authorization'],
      remove: true,
    },
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        },
  };
}
