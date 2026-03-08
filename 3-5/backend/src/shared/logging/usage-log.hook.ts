import { REQUEST_ID_HEADER } from '../observability/request-id.middleware';

import type { UsageLogQueue } from './usage-log.queue';

function pathOnly(url: string): string {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

export function registerUsageLogHook(fastify: any, usageLogQueue: UsageLogQueue): void {
  fastify.addHook('onResponse', async (request: any, reply: any) => {
    const apiKey = (request as any).apiKey as { apiKeyId: string } | undefined;
    if (!apiKey) return;

    const resolvedEndpoint = (request as any).resolvedEndpoint as { endpointId: string } | undefined;
    const requestId = ((request as any).requestId as string | undefined) ??
      (request.headers[REQUEST_ID_HEADER] as string | undefined);

    const startTime = (request as any).startTime as number | undefined;
    const responseTimeMs = typeof startTime === 'number' ? Date.now() - startTime : 0;

    usageLogQueue.enqueue({
      apiKeyId: apiKey.apiKeyId,
      endpointId: resolvedEndpoint?.endpointId,
      httpMethod: request.method,
      path: pathOnly(request.url),
      statusCode: reply.statusCode,
      responseTimeMs,
      requestId,
      timestamp: new Date()
    });
  });
}
