import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/db/prisma.service';
import { getConfig } from '../../common/config/config';
import { hmacSha256Hex, timingSafeEqualHex } from '../keys/api-key.hash';
import { parseBearerToken } from './bearer';
import { matchEndpoint } from './endpoint-matcher';
import { hasRequiredScopes } from './scope-evaluator';
import { forbidden, notFound, rateLimited, unauthorized } from './gateway.errors';
import { RateLimitPolicy } from '../rate-limit/rate-limit.policy';
import { RateLimitService } from '../rate-limit/rate-limit.service';

export type GatewayAuthResult = {
  serviceSlug: string;
  endpointId: string;
  keyId: string;
  userId: string;
  upstreamUrl: string;
  rateLimit?: {
    minuteLimit: number;
    minuteRemaining: number;
    minuteResetMs: number;
    hourLimit: number;
    hourRemaining: number;
    hourResetMs: number;
  };
};

type ServiceCatalog = Prisma.ApiServiceGetPayload<{
  include: {
    endpoints: {
      include: {
        scopeAllows: {
          include: {
            scope: true;
          };
        };
      };
    };
  };
}>;

type GatewayAuthContext = {
  serviceSlug: string;
  endpointId?: string;
  keyId?: string;
  userId?: string;
};

function withAuthContext<T extends Error>(err: T, ctx: GatewayAuthContext): T {
  (err as any).authContext = ctx;
  return err;
}

@Injectable()
export class GatewayGuardService {
  private serviceCache = new Map<string, { expiresAtMs: number; value: ServiceCatalog | null }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: RateLimitPolicy,
    private readonly limiter: RateLimitService,
  ) {}

  private async getActiveServiceCatalog(serviceSlug: string): Promise<ServiceCatalog | null> {
    const now = Date.now();
    const cached = this.serviceCache.get(serviceSlug);
    if (cached && cached.expiresAtMs > now) return cached.value;

    const service = await this.prisma.apiService.findUnique({
      where: { slug: serviceSlug },
      include: {
        endpoints: {
          where: { status: 'ACTIVE' },
          include: { scopeAllows: { include: { scope: true } } },
        },
      },
    });

    this.serviceCache.set(serviceSlug, { expiresAtMs: now + 1_000, value: service });
    return service;
  }

  async authorize(req: FastifyRequest, serviceSlug: string): Promise<GatewayAuthResult> {
    const parsed = parseBearerToken((req.headers as any).authorization);
    if (!parsed) throw unauthorized();

    const config = getConfig(process.env);
    const key = await this.prisma.apiKey.findUnique({
      where: { id: parsed.keyId },
      include: { user: true, scopes: { include: { scope: true } } },
    });
    if (!key) throw unauthorized();
    const baseCtx: GatewayAuthContext = { serviceSlug, keyId: key.id, userId: key.userId };
    if (key.status !== 'ACTIVE') throw withAuthContext(unauthorized(), baseCtx);
    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) throw withAuthContext(unauthorized(), baseCtx);
    if (key.user.status !== 'ACTIVE') throw withAuthContext(unauthorized(), baseCtx);

    const computed = hmacSha256Hex(config.apiKeyPepper, parsed.secret);
    if (!timingSafeEqualHex(key.secretHash, computed)) throw withAuthContext(unauthorized(), baseCtx);

    const service = await this.getActiveServiceCatalog(serviceSlug);
    if (!service || service.status !== 'ACTIVE') throw withAuthContext(notFound(), baseCtx);

    const path = (req.url ?? '').split('?')[0];
    const endpoint = matchEndpoint(
      service.endpoints.map((e) => ({ id: e.id, method: e.method, pathPattern: e.pathPattern })),
      (req.method || 'GET').toUpperCase(),
      '/' + (req.params as any)['*']?.toString().replace(/^\//, ''),
    );
    if (!endpoint) throw withAuthContext(notFound(), baseCtx);

    const fullEndpoint = service.endpoints.find((e) => e.id === endpoint.id)!;
    const endpointCtx: GatewayAuthContext = { ...baseCtx, endpointId: endpoint.id };
    const requiredScopes = fullEndpoint.scopeAllows.map((a) => a.scope.key);
    const grantedScopes = key.scopes.map((s) => s.scope.key);
    if (!hasRequiredScopes(requiredScopes, grantedScopes)) throw withAuthContext(forbidden(), endpointCtx);

    const limits = await this.policy.getEffectiveLimits({
      minuteLimitOverride: key.minuteLimitOverride,
      hourLimitOverride: key.hourLimitOverride,
    });
    const rl = await this.limiter.checkAndIncrement(key.id, limits);
    if (!rl.allowed) throw withAuthContext(rateLimited(), endpointCtx);

    return {
      serviceSlug: service.slug,
      endpointId: endpoint.id,
      keyId: key.id,
      userId: key.userId,
      upstreamUrl: service.upstreamUrl,
      rateLimit: {
        minuteLimit: rl.minute.limit,
        minuteRemaining: rl.minute.remaining,
        minuteResetMs: rl.minute.resetMs,
        hourLimit: rl.hour.limit,
        hourRemaining: rl.hour.remaining,
        hourResetMs: rl.hour.resetMs,
      },
    };
  }
}
