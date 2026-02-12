export type LogContext = {
  requestId?: string;
  userId?: string;
};

export type LogEventContext = LogContext & {
  action: string;
  meta?: Record<string, unknown>;
};

export function logInfo(message: string, ctx: LogContext = {}) {
  const prefix = ctx.requestId ? `[rid:${ctx.requestId}]` : '';
  const user = ctx.userId ? `[uid:${ctx.userId}]` : '';
  // eslint-disable-next-line no-console
  console.log(prefix, user, message);
}

export function logWarn(message: string, ctx: LogContext = {}) {
  const prefix = ctx.requestId ? `[rid:${ctx.requestId}]` : '';
  const user = ctx.userId ? `[uid:${ctx.userId}]` : '';
  // eslint-disable-next-line no-console
  console.warn(prefix, user, message);
}

export function logError(message: string, err: unknown, ctx: LogContext = {}) {
  const prefix = ctx.requestId ? `[rid:${ctx.requestId}]` : '';
  const user = ctx.userId ? `[uid:${ctx.userId}]` : '';
  // eslint-disable-next-line no-console
  console.error(prefix, user, message, err);
}

export function logEvent(ctx: LogEventContext) {
  const payload = {
    ts: new Date().toISOString(),
    rid: ctx.requestId,
    uid: ctx.userId,
    action: ctx.action,
    meta: ctx.meta ?? {},
  };
  // eslint-disable-next-line no-console
  console.log('EVENT', JSON.stringify(payload));
}
