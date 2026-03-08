import { Injectable } from '@nestjs/common';

import type { ApiKey } from '@prisma/client';

import { RateLimitBucketRepository } from './rate-limit.repository';
import { RateLimitPolicyService } from './rate-limit.policy.service';
import type { RateLimitDecision, RateLimitLimits, RateLimitWindow } from './rate-limit.types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function windowStart(now: Date, window: RateLimitWindow): Date {
  const d = new Date(now);
  if (window === 'minute') {
    d.setSeconds(0, 0);
    return d;
  }

  d.setMinutes(0, 0, 0);
  return d;
}

function secondsUntilWindowEnd(now: Date, window: RateLimitWindow): number {
  const start = windowStart(now, window).getTime();
  const end = window === 'minute' ? start + 60_000 : start + 60 * 60_000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

@Injectable()
export class RateLimitService {
  constructor(
    private readonly repo: RateLimitBucketRepository,
    private readonly policy: RateLimitPolicyService,
  ) {}

  async getLimitsForApiKey(apiKey: Pick<ApiKey, 'rateLimitPerMinute' | 'rateLimitPerHour'>): Promise<RateLimitLimits> {
    const p = await this.policy.getPolicy();
    const perMinute = apiKey.rateLimitPerMinute ?? p.defaultPerMinute;
    const perHour = apiKey.rateLimitPerHour ?? p.defaultPerHour;

    return {
      perMinute: clamp(perMinute, 1, p.capPerMinute),
      perHour: clamp(perHour, 1, p.capPerHour)
    };
  }

  async check(params: {
    apiKeyId: string;
    endpointId?: string;
    perMinute: number;
    perHour: number;
  }): Promise<RateLimitDecision> {
    const now = new Date();

    const minuteStart = windowStart(now, 'minute');
    const hourStart = windowStart(now, 'hour');

    const minuteCount = await this.repo.incrementAndGetCount({
      apiKeyId: params.apiKeyId,
      endpointId: params.endpointId,
      window: 'minute',
      startTs: minuteStart
    });

    if (minuteCount > params.perMinute) {
      return {
        allowed: false,
        retryAfterSeconds: secondsUntilWindowEnd(now, 'minute'),
        window: 'minute'
      };
    }

    const hourCount = await this.repo.incrementAndGetCount({
      apiKeyId: params.apiKeyId,
      endpointId: params.endpointId,
      window: 'hour',
      startTs: hourStart
    });

    if (hourCount > params.perHour) {
      return {
        allowed: false,
        retryAfterSeconds: secondsUntilWindowEnd(now, 'hour'),
        window: 'hour'
      };
    }

    return { allowed: true };
  }
}
