import { redact } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export function log(level: LogLevel, message: string, fields?: LogFields) {
  const payload = {
    level,
    message,
    ...(fields ? redact(fields) : undefined),
    ts: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](payload);
}
