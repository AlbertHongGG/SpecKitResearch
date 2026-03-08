import { redactObject } from './redaction';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger {
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const safeMeta = meta ? redactObject(meta) : undefined;
    // eslint-disable-next-line no-console
    console[level](message, safeMeta ?? '');
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }
  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }
  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }
}

export const logger: Logger = new ConsoleLogger();
