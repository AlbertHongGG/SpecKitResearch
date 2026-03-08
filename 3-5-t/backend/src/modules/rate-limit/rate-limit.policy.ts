import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';

@Injectable()
export class RateLimitPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveLimits(key: { minuteLimitOverride: number | null; hourLimitOverride: number | null }) {
    const settings = await this.prisma.rateLimitSetting.findUnique({ where: { id: 'singleton' } });
    const defaultMinute = settings?.defaultMinute ?? 60;
    const defaultHour = settings?.defaultHour ?? 1000;
    const maxMinute = settings?.maxMinute ?? 600;
    const maxHour = settings?.maxHour ?? 10_000;

    const minute = Math.min(key.minuteLimitOverride ?? defaultMinute, maxMinute);
    const hour = Math.min(key.hourLimitOverride ?? defaultHour, maxHour);
    return { minute, hour };
  }
}
