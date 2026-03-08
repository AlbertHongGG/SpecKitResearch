import { Injectable } from '@nestjs/common';
import type { EntitlementsOutput } from './entitlements.logic';

type CacheEntry = {
  value?: EntitlementsOutput;
  expiresAt?: number;
  inFlight?: Promise<EntitlementsOutput>;
};

@Injectable()
export class EntitlementsCache {
  private readonly cache = new Map<string, CacheEntry>();

  private ttlMs(): number {
    const raw = process.env.ENTITLEMENTS_CACHE_TTL_MS;
    const parsed = raw ? Number(raw) : 2_000;
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 2_000;
  }

  invalidate(orgId: string): void {
    this.cache.delete(orgId);
  }

  async getOrCompute(orgId: string, compute: () => Promise<EntitlementsOutput>): Promise<EntitlementsOutput> {
    const ttl = this.ttlMs();
    if (ttl === 0) return compute();

    const now = Date.now();
    const existing = this.cache.get(orgId);
    if (existing?.value && existing.expiresAt && existing.expiresAt > now) {
      return existing.value;
    }

    if (existing?.inFlight) {
      return existing.inFlight;
    }

    const inFlight = compute();
    this.cache.set(orgId, { inFlight });

    try {
      const value = await inFlight;
      this.cache.set(orgId, { value, expiresAt: now + ttl });
      return value;
    } catch (err) {
      this.cache.delete(orgId);
      throw err;
    }
  }
}
