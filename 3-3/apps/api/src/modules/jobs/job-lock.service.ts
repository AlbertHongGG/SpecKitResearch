import { Injectable } from '@nestjs/common';
import { Prisma } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class JobLockService {
  constructor(private readonly prisma: PrismaService) {}

  async withLock<T>(input: { name: string; lockedBy: string; ttlMs: number }, fn: () => Promise<T>): Promise<T | null> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMs);

    try {
      await this.prisma.jobLock.create({
        data: {
          name: input.name,
          lockedBy: input.lockedBy,
          lockedAt: now,
          expiresAt,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.jobLock.findUnique({ where: { name: input.name } });
        if (!existing || existing.expiresAt.getTime() > Date.now()) {
          return null;
        }
        // Take over expired lock.
        await this.prisma.jobLock.update({
          where: { name: input.name },
          data: { lockedBy: input.lockedBy, lockedAt: now, expiresAt },
        });
      } else {
        throw e;
      }
    }

    try {
      return await fn();
    } finally {
      // Best-effort release (in case of crash, expiry handles it)
      await this.prisma.jobLock.delete({ where: { name: input.name } }).catch(() => undefined);
    }
  }
}
