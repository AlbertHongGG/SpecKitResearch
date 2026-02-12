export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry = {
      level,
      message,
      ...meta
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
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

export const logger = new Logger();
