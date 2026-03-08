import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getConfig } from '../config/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const config = getConfig(process.env);
    super({
      datasources: { db: { url: config.databaseUrl } },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // Best-effort SQLite tuning
    try {
      // NOTE: Some PRAGMA statements (e.g. journal_mode) return rows in SQLite.
      // Using $executeRawUnsafe can fail with "Execute returned results".
      await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    } catch {
      // ignore
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
