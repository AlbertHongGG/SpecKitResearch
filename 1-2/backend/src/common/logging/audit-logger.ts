import pino from 'pino';

const audit = pino({ name: 'audit' });

export type AuditResult = 'success' | 'failure';

export function auditLog(args: {
    actorId?: string;
    action: string;
    leaveRequestId?: string;
    result: AuditResult;
    meta?: Record<string, unknown>;
    error?: { name?: string; message?: string };
}) {
    const payload = {
        actorId: args.actorId,
        action: args.action,
        leaveRequestId: args.leaveRequestId,
        result: args.result,
        meta: args.meta,
        err: args.error,
    };

    if (args.result === 'failure') {
        audit.warn(payload, 'audit');
        return;
    }

    audit.info(payload, 'audit');
}
