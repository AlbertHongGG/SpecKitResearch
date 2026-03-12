export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown> & {
  requestId?: string;
  userId?: string;
  orgId?: string;
  projectId?: string;
};

function toConsoleMethod(level: LogLevel) {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  if (level === 'debug') return console.debug;
  return console.log;
}

export function log(level: LogLevel, message: string, meta?: LogMeta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  toConsoleMethod(level)(JSON.stringify(entry));
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    log('debug', message, meta);
  },
  info(message: string, meta?: LogMeta) {
    log('info', message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    log('warn', message, meta);
  },
  error(message: string, meta?: LogMeta) {
    log('error', message, meta);
  },
} as const;
