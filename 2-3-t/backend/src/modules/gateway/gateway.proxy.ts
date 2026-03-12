import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

@Injectable()
export class GatewayProxyService {
  async proxy(req: FastifyRequest, reply: FastifyReply, upstreamBase: string, upstreamPath: string) {
    const fastifyReply = reply as any;
    const url = new URL(upstreamPath, upstreamBase).toString();

    return fastifyReply.from(url, {
      undici: {
        // Prevent hanging requests from tying up the gateway indefinitely.
        headersTimeout: 30_000,
        bodyTimeout: 30_000,
      },
      rewriteRequestHeaders: (_req: any, headers: Record<string, any>) => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(headers)) {
          const key = k.toLowerCase();
          if (hopByHop.has(key)) continue;
          if (key === 'authorization') continue;
          if (key === 'cookie') continue;
          out[k] = v;
        }
        return out;
      },
      rewriteHeaders: (headers: Record<string, any>) => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(headers)) {
          const key = k.toLowerCase();
          if (hopByHop.has(key)) continue;
          if (key === 'set-cookie') continue;
          out[k] = v;
        }
        return out;
      },
    });
  }
}
