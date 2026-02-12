export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  };
  console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
}
