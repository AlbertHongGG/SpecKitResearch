import pino from 'pino';
import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { DEFAULT_REDACT_PATHS } from './redaction';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: DEFAULT_REDACT_PATHS,
    censor: '[REDACTED]',
  },
});

export function createHttpLogger() {
  return pinoHttp({
    logger,
    quietReqLogger: true,
    genReqId(req: IncomingMessage) {
      const anyReq = req as IncomingMessage & {
        requestId?: string;
        headers: Record<string, string | string[] | undefined>;
      };
      const header = anyReq.headers['x-request-id'];
      const headerValue = Array.isArray(header) ? header[0] : header;
      return anyReq.requestId || headerValue || randomUUID();
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage(req, res, err) {
      return `${req.method} ${req.url} ${res.statusCode} ${err?.message ?? ''}`.trim();
    },
    customProps(req: IncomingMessage, _res: ServerResponse) {
      void _res;
      const anyReq = req as IncomingMessage & {
        requestId?: string;
        method?: string;
        url?: string;
        user?: { userId?: string; role?: unknown; departmentId?: string };
      };
      return {
        requestId: anyReq.requestId,
        actorId: anyReq.user?.userId,
        actorRole: anyReq.user?.role,
        actorDepartmentId: anyReq.user?.departmentId,
        action: anyReq.method,
        resource: anyReq.url,
      };
    },
    serializers: {
      req(req: unknown) {
        const r = req as { method?: unknown; url?: unknown; headers?: unknown };
        return {
          method: typeof r.method === 'string' ? r.method : undefined,
          url: typeof r.url === 'string' ? r.url : undefined,
          headers: r.headers,
        };
      },
      res(res: unknown) {
        const r = res as { statusCode?: unknown };
        return {
          statusCode:
            typeof r.statusCode === 'number' ? r.statusCode : undefined,
        };
      },
    },
  });
}
