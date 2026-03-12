import pino, { type LoggerOptions } from 'pino';
import type { AppConfig } from '../config/config';

export function createLogger(config: AppConfig) {
  const options: LoggerOptions = {
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'headers.authorization',
        'headers.cookie',
      ],
      remove: true,
    },
  };

  if (config.nodeEnv !== 'production') {
    return pino(options, pino.transport({ target: 'pino-pretty' }));
  }
  return pino(options);
}
