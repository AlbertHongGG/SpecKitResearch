import pinoHttp from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function createHttpLogger() {
    return pinoHttp({
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const existing = (req as any).id;
            if (typeof existing === 'string' && existing.length > 0) return existing;

            const header = (req.headers as any)?.['x-request-id'];
            const id = typeof header === 'string' && header.length > 0 ? header : 'unknown';
            (req as any).id = id;
            res.setHeader('X-Request-Id', id);
            return id;
        },
    });
}
