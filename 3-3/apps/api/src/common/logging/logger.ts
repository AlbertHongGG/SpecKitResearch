import type { Request } from 'express';
import { getContext } from '../request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

function safeError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return { error: String(error) };
  const e = error as any;
  return {
    name: typeof e.name === 'string' ? e.name : undefined,
    message: typeof e.message === 'string' ? e.message : undefined,
    stack: typeof e.stack === 'string' ? e.stack : undefined,
  };
}

export function log(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...fields,
  };

  const line = JSON.stringify(payload);
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

export function logForRequest(
  req: Request,
  input: {
    level: LogLevel;
    message: string;
    action?: string;
    errorCode?: string;
    fields?: LogFields;
    error?: unknown;
  },
) {
  let requestId: string | undefined;
  let orgId: string | undefined;
  let actorId: string | undefined;

  try {
    const ctx = getContext(req);
    requestId = ctx.requestId;
    orgId = ctx.org?.id;
    actorId = ctx.user?.id;
  } catch {
    // ignore
  }

  log(input.level, input.message, {
    requestId,
    orgId,
    actorId,
    action: input.action,
    errorCode: input.errorCode,
    ...(input.fields ?? {}),
    ...(input.error ? { error: safeError(input.error) } : {}),
  });
}
