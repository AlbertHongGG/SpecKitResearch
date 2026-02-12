export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(fields ?? {}),
  };

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export function logInfo(message: string, fields?: Record<string, unknown>) {
  log('info', message, fields);
}

export function logWarn(message: string, fields?: Record<string, unknown>) {
  log('warn', message, fields);
}

export function logError(message: string, fields?: Record<string, unknown>) {
  log('error', message, fields);
}
