import { describe, expect, it, vi } from 'vitest';

import { HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';

import { RateLimitGuard } from '../../src/guards/rate-limit.guard';
import { RateLimitService } from '../../src/shared/rate-limit/rate-limit.service';

describe('RateLimitService', () => {
  it('denies when minute limit exceeded', async () => {
    const repo = {
      incrementAndGetCount: vi.fn()
        .mockResolvedValueOnce(61) // minute
        .mockResolvedValueOnce(1) // hour (should not be reached)
    } as any;

    const policy = {
      getPolicy: vi.fn().mockResolvedValue({
        defaultPerMinute: 60,
        defaultPerHour: 1000,
        capPerMinute: 600,
        capPerHour: 10_000,
        updatedAt: new Date(0)
      })
    } as any;

    const svc = new RateLimitService(repo, policy);
    const decision = await svc.check({ apiKeyId: 'k1', endpointId: 'e1', perMinute: 60, perHour: 1000 });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.window).toBe('minute');
      expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('denies when hour limit exceeded', async () => {
    const repo = {
      incrementAndGetCount: vi.fn()
        .mockResolvedValueOnce(1) // minute
        .mockResolvedValueOnce(1001) // hour
    } as any;

    const policy = {
      getPolicy: vi.fn().mockResolvedValue({
        defaultPerMinute: 60,
        defaultPerHour: 1000,
        capPerMinute: 600,
        capPerHour: 10_000,
        updatedAt: new Date(0)
      })
    } as any;

    const svc = new RateLimitService(repo, policy);
    const decision = await svc.check({ apiKeyId: 'k1', endpointId: 'e1', perMinute: 60, perHour: 1000 });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.window).toBe('hour');
      expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});

describe('RateLimitGuard', () => {
  it('throws 429 and sets Retry-After when over limit', async () => {
    const rateLimitService = {
      getLimitsForApiKey: vi.fn().mockResolvedValue({ perMinute: 60, perHour: 1000 }),
      check: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 10, window: 'minute' })
    } as unknown as RateLimitService;

    const guard = new RateLimitGuard(rateLimitService);

    const headers: Record<string, string> = {};
    const reply = {
      header: (k: string, v: string) => {
        headers[k] = v;
      }
    } as any;

    const request = {
      apiKey: { apiKeyId: 'k1', rateLimitPerMinute: null, rateLimitPerHour: null },
      resolvedEndpoint: { endpointId: 'e1' }
    } as any;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => reply
      })
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(headers['Retry-After']).toBe('10');

    try {
      await guard.canActivate(ctx);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('fails closed (503) when store errors', async () => {
    const rateLimitService = {
      getLimitsForApiKey: vi.fn().mockResolvedValue({ perMinute: 60, perHour: 1000 }),
      check: vi.fn().mockRejectedValue(new Error('db down'))
    } as unknown as RateLimitService;

    const guard = new RateLimitGuard(rateLimitService);

    const reply = { header: vi.fn() } as any;
    const request = { apiKey: { apiKeyId: 'k1' } } as any;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => reply
      })
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
