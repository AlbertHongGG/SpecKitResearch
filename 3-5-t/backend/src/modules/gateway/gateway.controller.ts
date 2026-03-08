import { All, Controller, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { GatewayGuardService } from './gateway.guard';
import { GatewayProxyService } from './gateway.proxy';
import { UsageWriter } from '../logs/usage.writer';
import { assertUpstreamAllowed } from './upstreams';
import { getConfig } from '../../common/config/config';
import { errorCodeFromHttpStatus } from '../../common/http/error-codes';

@Controller()
export class GatewayController {
  constructor(
    private readonly guard: GatewayGuardService,
    private readonly proxy: GatewayProxyService,
    private readonly usage: UsageWriter,
  ) {}

  @All('/gateway/:service/*')
  async handle(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const started = Date.now();
    const requestId = (req as any).id;
    const service = (req.params as any).service as string;
    const wildcard = ((req.params as any)['*'] as string) ?? '';
    const upstreamPath = '/' + String(wildcard).replace(/^\//, '');

    let authCtx:
      | { keyId?: string; userId?: string; serviceSlug?: string; endpointId?: string }
      | undefined;

    try {
      const auth = await this.guard.authorize(req, service);
      authCtx = { keyId: auth.keyId, userId: auth.userId, serviceSlug: auth.serviceSlug, endpointId: auth.endpointId };
      const config = getConfig(process.env);
      assertUpstreamAllowed(auth.upstreamUrl, config.upstreamAllowlistHosts);

      reply.header('x-rate-limit-minute-limit', auth.rateLimit?.minuteLimit);
      reply.header('x-rate-limit-minute-remaining', auth.rateLimit?.minuteRemaining);
      reply.header('x-rate-limit-hour-limit', auth.rateLimit?.hourLimit);
      reply.header('x-rate-limit-hour-remaining', auth.rateLimit?.hourRemaining);

      const result = await this.proxy.proxy(req, reply, auth.upstreamUrl, upstreamPath);

      this.usage.enqueue({
        requestId,
        keyId: auth.keyId,
        userId: auth.userId,
        serviceSlug: auth.serviceSlug,
        endpointId: auth.endpointId,
        method: req.method,
        path: upstreamPath,
        statusCode: reply.statusCode ?? 200,
        durationMs: Date.now() - started,
        outcome: 'ALLOWED',
      });

      return result;
    } catch (e: any) {
      const status = e?.getStatus?.() ?? 500;
      const code = e?.response?.error?.code ?? errorCodeFromHttpStatus(status);
      const ctx = (e as any)?.authContext ?? authCtx;
      this.usage.enqueue({
        requestId,
        keyId: ctx?.keyId,
        userId: ctx?.userId,
        endpointId: ctx?.endpointId,
        method: req.method,
        path: upstreamPath,
        statusCode: status,
        durationMs: Date.now() - started,
        outcome: 'DENIED',
        errorCode: code,
        serviceSlug: ctx?.serviceSlug ?? service,
      });
      throw e;
    }
  }
}
