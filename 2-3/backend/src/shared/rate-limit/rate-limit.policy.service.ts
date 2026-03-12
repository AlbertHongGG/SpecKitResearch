import { BadRequestException, Injectable } from '@nestjs/common';

import { ErrorCodes } from '../errors/error.codes';
import { toErrorResponse } from '../errors/error.response';
import { PrismaService } from '../db/prisma.service';

export type RateLimitPolicy = {
  defaultPerMinute: number;
  defaultPerHour: number;
  capPerMinute: number;
  capPerHour: number;
  updatedAt: Date;
};

const POLICY_ID = 'default';

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

@Injectable()
export class RateLimitPolicyService {
  private cached: { value: RateLimitPolicy; expiresAt: number } | null = null;
  private readonly cacheTtlMs = 5_000;

  constructor(private readonly prisma: PrismaService) {}

  invalidateCache(): void {
    this.cached = null;
  }

  async getPolicy(): Promise<RateLimitPolicy> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAt) return this.cached.value;

    const row = await this.prisma.rateLimitPolicy.findUnique({ where: { id: POLICY_ID } });
    if (!row) {
      // Fallback to constants used historically; should be seeded in normal envs.
      const fallback: RateLimitPolicy = {
        defaultPerMinute: 60,
        defaultPerHour: 1000,
        capPerMinute: 600,
        capPerHour: 10_000,
        updatedAt: new Date(0)
      };
      this.cached = { value: fallback, expiresAt: now + this.cacheTtlMs };
      return fallback;
    }

    const policy: RateLimitPolicy = {
      defaultPerMinute: row.defaultPerMinute,
      defaultPerHour: row.defaultPerHour,
      capPerMinute: row.capPerMinute,
      capPerHour: row.capPerHour,
      updatedAt: row.updatedAt
    };
    this.cached = { value: policy, expiresAt: now + this.cacheTtlMs };
    return policy;
  }

  async updatePolicy(input: {
    defaultPerMinute: number;
    defaultPerHour: number;
    capPerMinute: number;
    capPerHour: number;
  }): Promise<RateLimitPolicy> {
    if (![input.defaultPerMinute, input.defaultPerHour, input.capPerMinute, input.capPerHour].every(isPositiveInt)) {
      throw new BadRequestException(
        toErrorResponse({ code: ErrorCodes.BadRequest, message: 'Rate limit values must be positive integers' })
      );
    }

    if (input.defaultPerMinute > input.capPerMinute || input.defaultPerHour > input.capPerHour) {
      throw new BadRequestException(
        toErrorResponse({ code: ErrorCodes.BadRequest, message: 'Default rate limit must not exceed cap' })
      );
    }

    const updated = await this.prisma.rateLimitPolicy.upsert({
      where: { id: POLICY_ID },
      update: {
        defaultPerMinute: input.defaultPerMinute,
        defaultPerHour: input.defaultPerHour,
        capPerMinute: input.capPerMinute,
        capPerHour: input.capPerHour
      },
      create: {
        id: POLICY_ID,
        defaultPerMinute: input.defaultPerMinute,
        defaultPerHour: input.defaultPerHour,
        capPerMinute: input.capPerMinute,
        capPerHour: input.capPerHour
      }
    });

    const policy: RateLimitPolicy = {
      defaultPerMinute: updated.defaultPerMinute,
      defaultPerHour: updated.defaultPerHour,
      capPerMinute: updated.capPerMinute,
      capPerHour: updated.capPerHour,
      updatedAt: updated.updatedAt
    };

    this.cached = { value: policy, expiresAt: Date.now() + this.cacheTtlMs };
    return policy;
  }

  async assertWithinCap(input: { perMinute?: number | null; perHour?: number | null }): Promise<void> {
    const policy = await this.getPolicy();

    if (typeof input.perMinute === 'number' && input.perMinute > policy.capPerMinute) {
      throw new BadRequestException(
        toErrorResponse({
          code: ErrorCodes.BadRequest,
          message: `rate_limit_per_minute exceeds cap (${policy.capPerMinute})`
        })
      );
    }

    if (typeof input.perHour === 'number' && input.perHour > policy.capPerHour) {
      throw new BadRequestException(
        toErrorResponse({
          code: ErrorCodes.BadRequest,
          message: `rate_limit_per_hour exceeds cap (${policy.capPerHour})`
        })
      );
    }
  }
}
