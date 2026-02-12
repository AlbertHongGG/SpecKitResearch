export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  errorCode?: string;
};

function write(level: LogLevel, message: string, ctx?: LogContext, extra?: unknown) {
  const payload = {
    level,
    message,
    ...ctx,
    extra,
    ts: new Date().toISOString(),
  };

  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, ctx?: LogContext, extra?: unknown) => write('debug', message, ctx, extra),
  info: (message: string, ctx?: LogContext, extra?: unknown) => write('info', message, ctx, extra),
  warn: (message: string, ctx?: LogContext, extra?: unknown) => write('warn', message, ctx, extra),
  error: (message: string, ctx?: LogContext, extra?: unknown) => write('error', message, ctx, extra),
};
