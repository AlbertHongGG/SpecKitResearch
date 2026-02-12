export type LogFields = Record<string, unknown>;

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, fields?: LogFields) {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](JSON.stringify(line));
}

export const logger = {
  debug: (message: string, fields?: LogFields) => log('debug', message, fields),
  info: (message: string, fields?: LogFields) => log('info', message, fields),
  warn: (message: string, fields?: LogFields) => log('warn', message, fields),
  error: (message: string, fields?: LogFields) => log('error', message, fields),
};
